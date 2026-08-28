import bcrypt from "bcryptjs";
import {db} from "../libs/db.js"
import { UserRole } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Domains permitted to self-register, from SIGNUP_ALLOWED_DOMAINS (comma
 * separated). Leaving it unset allows any domain, which is only appropriate for
 * local development.
 *
 * This narrows self-registration to people who already hold a college address;
 * it does not stop one member of the institution from claiming a colleague's
 * address. Closing registration entirely is the complete fix.
 */
const ALLOWED_SIGNUP_DOMAINS = String(process.env.SIGNUP_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

const isAllowedSignupEmail = (email) => {
    if(ALLOWED_SIGNUP_DOMAINS.length === 0) return true;

    const domain = email.split("@")[1];
    if(!domain) return false;

    // Subdomains count: "indusuni.ac.in" also permits "iite.indusuni.ac.in".
    return ALLOWED_SIGNUP_DOMAINS.some(
        (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
    );
}

/**
 * Bcrypt hash of a value nobody can supply. Compared against when no user
 * matches, so a wrong identifier costs the same time as a wrong password and
 * cannot be distinguished by response timing.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/**
 * Emails are stored lowercase, enrollment numbers uppercase. The "@" test is
 * only about which casing to apply — lookup always tries both columns.
 */
const normalizeIdentifier = (raw) => {
    const value = String(raw ?? "").trim();
    return value.includes("@") ? value.toLowerCase() : value.toUpperCase();
}

const issueSession = (res, userId) => {
    const token = jwt.sign({id:userId} , process.env.JWT_SECRET , {
        expiresIn:"7d"
    })

    res.cookie("jwt" , token , {
        httpOnly:true,
        sameSite:"strict",
        secure:process.env.NODE_ENV !== "development",
        maxAge:1000 * 60 * 60 * 24 * 7 // 7 days
    })
}

const publicUser = (user) => ({
    id:user.id,
    email:user.email,
    enrollmentNo:user.enrollmentNo,
    name:user.name,
    role:user.role,
    image:user.image,
    mustChangePassword:user.mustChangePassword
})

export const register = async (req , res)=>{
    const {password , name} = req.body;
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const enrollmentNo = String(req.body.enrollmentNo ?? "").trim().toUpperCase();

    try {
        if(!email || !enrollmentNo || !password){
            return res.status(400).json({
                error:"Name, email, enrollment number and password are required"
            })
        }

        if(password.length < MIN_PASSWORD_LENGTH){
            return res.status(400).json({
                error:`Password must be at least ${MIN_PASSWORD_LENGTH} characters`
            })
        }

        if(password.toUpperCase() === enrollmentNo){
            return res.status(400).json({
                error:"Password cannot be the same as your enrollment number"
            })
        }

        if(!isAllowedSignupEmail(email)){
            return res.status(403).json({
                error:`Sign up requires a college email address (${ALLOWED_SIGNUP_DOMAINS.join(", ")})`,
                code:"EMAIL_DOMAIN_NOT_ALLOWED"
            })
        }

        const existingUser = await db.user.findFirst({
            where:{
                OR:[{ email }, { enrollmentNo }]
            }
        })

        if(existingUser){
            return res.status(400).json({
                error:"An account with this email or enrollment number already exists"
            })
        }


        const hashedPassword = await bcrypt.hash(password , 10);

        const newUser = await db.user.create({
            data:{
                email,
                enrollmentNo,
                password:hashedPassword,
                name,
                role:UserRole.USER
            }
        })

        issueSession(res, newUser.id);

        res.status(201).json({
            success:true,
            message:"User created successfully",
            user:publicUser(newUser)
        })

    } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({
                error:"Error creating user"
            })
    }
}

export const login = async (req , res)=>{
    const {password} = req.body;
    // Accepts "identifier"; "email" is still read so older clients keep working.
    const identifier = normalizeIdentifier(req.body.identifier ?? req.body.email);

    try {
        if(!identifier || !password){
            return res.status(400).json({
                error:"Enrollment number or email and password are required"
            })
        }

        const user = await db.user.findFirst({
            where:{
                OR:[{ email: identifier }, { enrollmentNo: identifier }]
            }
        })

        // Enrollment numbers are sequential and guessable, so the response must
        // never reveal whether an account exists.
        const isMatch = await bcrypt.compare(password , user?.password ?? DUMMY_HASH);

        if(!user || !isMatch){
            return res.status(401).json({
                error:"Invalid credentials"
            })
        }

        issueSession(res, user.id);

        res.status(200).json({
            success:true,
            message:"User Logged in successfully",
            user:publicUser(user)
        })


    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({
            error:"Error logging in user"
        })
    }
}


export const logout = async (req , res)=>{
    try {
        res.clearCookie("jwt" , {
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV !== "development",
        })

        res.status(200).json({
            success:true,
            message:"User logged out successfully"
        })
    } catch (error) {
        console.error("Error logging out user:", error);
        res.status(500).json({
            error:"Error logging out user"
        })
    }
}

export const changePassword = async (req , res)=>{
    const {currentPassword , newPassword} = req.body;

    try {
        if(!currentPassword || !newPassword){
            return res.status(400).json({
                error:"Current and new password are required"
            })
        }

        if(newPassword.length < MIN_PASSWORD_LENGTH){
            return res.status(400).json({
                error:`New password must be at least ${MIN_PASSWORD_LENGTH} characters`
            })
        }

        if(currentPassword === newPassword){
            return res.status(400).json({
                error:"New password must be different from the current one"
            })
        }

        const user = await db.user.findUnique({
            where:{ id:req.user.id },
            select:{ id:true, password:true, enrollmentNo:true }
        })

        if(!user){
            return res.status(404).json({ error:"User not found" })
        }

        // Seeded students start with their enrollment number as the password;
        // setting it straight back would defeat the forced change.
        if(user.enrollmentNo && newPassword.toUpperCase() === user.enrollmentNo){
            return res.status(400).json({
                error:"Password cannot be the same as your enrollment number"
            })
        }

        const isMatch = await bcrypt.compare(currentPassword , user.password);

        if(!isMatch){
            return res.status(401).json({
                error:"Current password is incorrect"
            })
        }

        const hashedPassword = await bcrypt.hash(newPassword , 10);

        const updated = await db.user.update({
            where:{ id:user.id },
            data:{
                password:hashedPassword,
                mustChangePassword:false
            }
        })

        res.status(200).json({
            success:true,
            message:"Password changed successfully",
            user:publicUser(updated)
        })

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({
            error:"Error changing password"
        })
    }
}

export const check = async (req , res)=>{
    try {
        res.status(200).json({
            success:true,
            message:"User authenticated successfully",
            user:req.user
        });
    } catch (error) {
        console.error("Error checking user:", error);
        res.status(500).json({
            error:"Error checking user"
        })
    }
}
