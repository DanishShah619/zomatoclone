import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  role: "customer" | "rider" | "seller" | "admin" | null;
}

const schema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: ["customer", "rider", "seller", "admin", null],
      default: null,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

const User =
  (mongoose.models.User as Model<IUser> | undefined) ||
  mongoose.model<IUser>("User", schema);

export default User;
