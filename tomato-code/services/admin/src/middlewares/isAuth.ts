import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getUserCollection } from "../util/collection.js";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  restaurantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const decodedValue = jwt.verify(
      token,
      process.env.JWT_SEC as string
    ) as JwtPayload;

    if (
      !decodedValue ||
      !decodedValue.user ||
      typeof decodedValue.user !== "object" ||
      !("_id" in decodedValue.user)
    ) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    req.user = decodedValue.user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Please Login - Jwt error",
    });
  }
};

export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Please Login",
      });
      return;
    }

    if (!ObjectId.isValid(req.user._id)) {
      res.status(401).json({
        message: "Invalid user",
      });
      return;
    }

    const currentUser = await (await getUserCollection()).findOne(
      { _id: new ObjectId(req.user._id) },
      { projection: { role: 1 } }
    );

    if (!currentUser || currentUser.role !== "admin") {
      res.status(403).json({
        message: "Access denied",
      });
      return;
    }

    req.user.role = currentUser.role;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Please Login",
    });
  }
};
