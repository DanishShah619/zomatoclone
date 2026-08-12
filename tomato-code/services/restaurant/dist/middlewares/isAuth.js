import jwt from "jsonwebtoken";
import User from "../models/User.js";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({
                message: "Please Login - Token missing",
            });
            return;
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SEC);
        if (!decodedValue ||
            !decodedValue.user ||
            typeof decodedValue.user !== "object" ||
            !("_id" in decodedValue.user)) {
            res.status(401).json({
                message: "Invalid token",
            });
            return;
        }
        req.user = decodedValue.user;
        next();
    }
    catch (error) {
        res.status(401).json({
            message: "Please Login - Jwt error",
        });
    }
};
export const isSeller = async (req, res, next) => {
    const user = req.user;
    if (!user?._id) {
        res.status(401).json({
            message: "Please Login",
        });
        return;
    }
    const currentUser = await User.findById(user._id).select("role").lean();
    if (!currentUser || currentUser.role !== "seller") {
        res.status(403).json({
            message: "You are not authorized seller",
        });
        return;
    }
    user.role = currentUser.role;
    next();
};
