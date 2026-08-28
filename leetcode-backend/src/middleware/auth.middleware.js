import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";

const loadUser = async (req, res, next) => {
     try {
        const token = req.cookies.jwt;

        if(!token){
            return res.status(401).json({
                message:"Unauthorized - No token provided"
            })
        }

        let decoded;

        try {
            decoded = jwt.verify(token , process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                message:"Unauthorized - Invalid token"
            })
        }

        const user = await db.user.findUnique({
            where:{
                id:decoded.id
            },
            select:{
                id:true,
                image:true,
                name:true,
                email:true,
                role:true,
                enrollmentNo:true,
                mustChangePassword:true
            }
        });


        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Error authenticating user:", error);
        res.status(500).json({message:"Error authenticating user"});
    }
}

/**
 * Authentication without the forced-password-change gate. Only for the handful
 * of routes a user must still reach while their password is expired: logout,
 * check and change-password.
 */
export const authMiddlewareAllowPasswordChange = loadUser;

/**
 * Standard authentication. Refuses every request while mustChangePassword is
 * set, so the gate cannot be bypassed by skipping the frontend screen.
 */
export const authMiddleware = (req, res, next) =>
    loadUser(req, res, () => {
        if(req.user.mustChangePassword){
            return res.status(403).json({
                code:"PASSWORD_CHANGE_REQUIRED",
                message:"You must change your password before continuing"
            });
        }
        next();
    });

export const requireRole = (...roles) => (req, res, next) => {
    if(!req.user || !roles.includes(req.user.role)){
        return res.status(403).json({
            message:"Forbidden - insufficient permissions"
        });
    }
    next();
}

export const checkAdmin = requireRole("ADMIN");
