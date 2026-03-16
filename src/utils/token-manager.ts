import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, COOKIE_NAME } from "./constants.js";

export const createToken = (id: string, email: string, expiresIn: string) => {
    const payload = { id, email };
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: expiresIn as any,
    });
    return token;
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.signedCookies[COOKIE_NAME] || req.cookies[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ message: "No Token Found" });
    }

    return new Promise<void>((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, success) => {
            if (err) {
                // clear invalid/expired token
                res.clearCookie(COOKIE_NAME);
                res.clearCookie(JWT_SECRET);
                return res.status(401).json({ message: "Token Expired or Invalid" });
            }
            else {
                resolve();
                res.locals.jwtData = success;
                return next();
            }
        })
    })
}

