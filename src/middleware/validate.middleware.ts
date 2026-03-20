import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

export const validate = (schema: ZodTypeAny) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        } catch (error) {
            res.status(400).json({ message: error.errors });
        }
    }
}