import {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";

export const authenticateToken = (req: Request | any, res: Response | any, next: NextFunction) => {
    // get refresh or access token
    const token = req.cookies.refreshToken;

    console.log(token)
    if (!token) return res.status(401).json({error: 'Unauthorized'});

    jwt.verify(token, process.env.AUTH_SECRET!, (err: any, user: any) => {
        console.log({user})
        if (err) return res.status(403).json({error: 'Invalid token'});
        req.user = user;
        next();
    });
};