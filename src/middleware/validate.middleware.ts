import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * desc validates that the request query, params and body are valid
 * @param validator the Zod validation that will be used to validate the request
 */
export const validate = (schema: ZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        next();
    } catch (error) {
        // If error is instance of ZodError then return error to client to show it to user
        if (error instanceof ZodError) {
            return res.status(400).send({ msg: error.issues[0].message });
        }

        return res.status(500).send("Error making request, contact support");
    }
};