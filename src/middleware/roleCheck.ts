// check role of user using jwtData.role
import { NextFunction, Request, Response } from "express";

export const roleCheck = (role: String) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (res.locals.jwtData.role !== role) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    }
}