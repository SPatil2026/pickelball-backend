import { Request, Response } from "express";
import prisma from "../../db/prisma.js";
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";

const uploadToCloudinary = (file: Express.Multer.File): Promise<any> => {
    return new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "venue_images" },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
    });
};

const extractPublicIdFromUrl = (url: string): string | null => {
    try {
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        const relevantParts = parts.slice(uploadIndex + 2);
        const fullPath = relevantParts.join('/');
        return fullPath.split('.')[0];
    } catch (e) {
        return null;
    }
};

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

        // check if venue already has 5 images
        const existingImages = await prisma.courtImages.count({ where: { venue_id } });
        if (existingImages >= 5) {
            return res.status(400).json({ message: "Maximum 5 images are already uploaded" });
        }

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

// 1. POST /venues/:venue_id/images
export const addMoreVenueImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const venue_id = req.params.venue_id as string;
        const userId = res.locals.jwtData.user_id as string;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const venue = await prisma.venue.findUnique({ where: { venue_id } });
        if (!venue || venue.owner_id !== userId) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }

        const existingCount = await prisma.courtImages.count({ where: { venue_id } });
        if (existingCount + files.length > 5) {
            res.status(400).json({ message: `Maximum 5 images allowed. You have ${existingCount} images, cannot add ${files.length} more.` });
            return;
        }

        const uploadResults = await Promise.all(files.map(f => uploadToCloudinary(f)));
        const imagesData = uploadResults.map(result => ({
            venue_id,
            image_url: result.secure_url,
            is_thumbnail: existingCount === 0 // If it's the first image ever, make it thumbnail
        }));

        const createdImages = await prisma.courtImages.createManyAndReturn({
            data: imagesData
        });

        res.status(201).json({ message: "Images added successfully", createdImages });
    } catch (error) {
        console.error("[addMoreVenueImages]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 2. DELETE /venues/images/:image_id
export const deleteVenueImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const image_id = req.params.image_id as string;
        const userId = res.locals.jwtData.user_id as string;

        const image = await prisma.courtImages.findUnique({
            where: { image_id },
            include: { venue: true }
        }) as any;

        if (!image || image.venue.owner_id !== userId) {
            res.status(403).json({ message: "Forbidden or not found" });
            return;
        }

        // 1. Delete from Cloudinary
        const publicId = extractPublicIdFromUrl(image.image_url);
        if (publicId) await cloudinary.uploader.destroy(publicId);

        // 2. Delete from DB
        await prisma.courtImages.delete({ where: { image_id } });

        // 3. Fallback: If it was the thumbnail, set a new thumbnail
        if (image.is_thumbnail) {
            const nextImage = await prisma.courtImages.findFirst({ where: { venue_id: image.venue_id } });
            if (nextImage) {
                await prisma.courtImages.update({
                    where: { image_id: nextImage.image_id },
                    data: { is_thumbnail: true }
                });
            }
        }

        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error("[deleteVenueImage]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 3. PUT /venues/images/:image_id
export const replaceVenueImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const image_id = req.params.image_id as string;
        const userId = res.locals.jwtData.user_id as string;
        const file = req.file as Express.Multer.File;

        if (!file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const image = await prisma.courtImages.findUnique({
            where: { image_id },
            include: { venue: true }
        }) as any;

        if (!image || image.venue.owner_id !== userId) {
            res.status(403).json({ message: "Forbidden or not found" });
            return;
        }

        // 1. Destroy old in Cloudinary
        const oldPublicId = extractPublicIdFromUrl(image.image_url);
        if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId);

        // 2. Upload new to Cloudinary
        const uploadResult = await uploadToCloudinary(file);

        // 3. Update DB
        const updatedImage = await prisma.courtImages.update({
            where: { image_id },
            data: { image_url: uploadResult.secure_url }
        });

        res.status(200).json({ message: "Image replaced successfully", updatedImage });
    } catch (error) {
        console.error("[replaceVenueImage]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// 4. PUT /venues/images/:image_id/thumbnail
export const setVenueThumbnail = async (req: Request, res: Response): Promise<void> => {
    try {
        const image_id = req.params.image_id as string;
        const userId = res.locals.jwtData.user_id as string;

        const image = await prisma.courtImages.findUnique({
            where: { image_id },
            include: { venue: true }
        }) as any;

        if (!image || image.venue.owner_id !== userId) {
            res.status(403).json({ message: "Forbidden or not found" });
            return;
        }

        // Transaction to flip the thumbnail flags
        await prisma.$transaction([
            prisma.courtImages.updateMany({
                where: { venue_id: image.venue_id },
                data: { is_thumbnail: false }
            }),
            prisma.courtImages.update({
                where: { image_id },
                data: { is_thumbnail: true }
            })
        ]);

        res.status(200).json({ message: "Thumbnail updated successfully" });
    } catch (error) {
        console.error("[setVenueThumbnail]", error);
        res.status(500).json({ message: "Internal server error" });
    }
};