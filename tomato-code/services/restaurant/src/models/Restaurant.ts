import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  description?: string;
  cuisines: string[];
  image: string;
  ownerId: string;
  phone: number;
  isVerified: boolean;

  autoLocation: {
    type: "Point";
    coordinates: [number, number]; //[longitude, latitude]
    formattedAddress: string;
  };
  isOpen: boolean;
  offer: {
    isActive: boolean;
    discountPercent: number;
  };
  createdAt: Date;
}

const schema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    cuisines: {
      type: [String],
      default: [],
      set: (values: string[]) =>
        values
          .map((value) => value.trim())
          .filter(Boolean),
    },
    image: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
    },

    autoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      formattedAddress: {
        type: String,
      },
    },

    isOpen: {
      type: Boolean,
      default: false,
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

schema.index({ ownerId: 1 }, { unique: true });
schema.index({ isVerified: 1 });
schema.index({ "offer.isActive": 1 });
schema.index({ cuisines: 1 });
schema.index({ autoLocation: "2dsphere" });

export default mongoose.model<IRestaurant>("Restaurant", schema);
