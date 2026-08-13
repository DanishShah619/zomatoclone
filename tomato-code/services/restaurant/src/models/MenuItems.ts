import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  image?: string;
  price: number;
  isAvailable: boolean;
  offer: {
    isActive: boolean;
    discountPercent: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    offer: {
      isActive: {
        type: Boolean,
        default: false,
      },
      discountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 90,
      },
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ "offer.isActive": 1 });

export default mongoose.model<IMenuItem>("MenuItem", schema);
