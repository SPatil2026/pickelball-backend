import { Request, Response } from "express";
import prisma from "../../db/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";

export const createVenue = async (req: Request, res: Response) => {
    const userId = res.locals.jwtData.user_id;
    const { name, address, contact_number, email, opening_time, closing_time } = req.body;

    if (!name || !address || !contact_number || !email || !opening_time || !closing_time) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const venue = await prisma.venue.create({
            data: {
                name,
                address,
                contact_number,
                email,
                opening_time,
                closing_time,
                owner_id: userId,
            },
        });
        return res.status(201).json({ message: "Venue created successfully", venue });
    } catch (error) {
        console.error("[createVenue]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const createCourt = async (req: Request, res: Response) => {

    const { venue_id, court_number } = req.body;

    if (!venue_id || !court_number) {
        return res.status(400).json({ message: "All fileds are required!" });
    }

    try {
        const court = await prisma.court.create({
            data: {
                venue_id,
                court_number
            },
        });

        return res.status(201).json({ message: "Court created successfully", court });

    } catch (err) {
        console.error("[createCourt]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const uplaodVenueImages = async (req: Request, res: Response) => {
    try {
        const { venue_id } = req.body;

        const files = req.files as Express.Multer.File[];

        if (!files || files.length == 0) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (files.length > 5) {
            return res.status(400).json({ message: "Maximum 5 images are allowed" });
        }

        const uploadToCloudinary = (file: Express.Multer.File) => {
            return new Promise<any>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "venue_images",
                    },
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );

                streamifier.createReadStream(file.buffer).pipe(stream);
            });
        };

        const uploadResults = await Promise.all(
            files.map((file) => uploadToCloudinary(file))
        );

        // OPTIONAL: reset previous thumbnails for this venue
        await prisma.courtImages.updateMany({
            where: { venue_id },
            data: { is_thumbnail: false },
        });

        // Prepare data for DB
        const imagesData = uploadResults.map((result, index) => ({
            venue_id,
            image_url: result.secure_url,
            is_thumbnail: index === 0, // first image is thumbnail
            // optional but recommended:
            // public_id: result.public_id,
        }));

        // Insert all images
        const createdImages = await prisma.courtImages.createMany({
            data: imagesData,
        });

        return res.status(201).json({
            message: "Images uploaded successfully",
            images: createdImages,
            data: imagesData,
        });

    }
    catch (err) {
        console.error("[uplaodVenueImages]", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}