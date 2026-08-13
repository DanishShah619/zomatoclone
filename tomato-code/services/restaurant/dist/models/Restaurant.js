import mongoose, { Schema } from "mongoose";
const schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: String,
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
}, {
    timestamps: true,
});
schema.index({ ownerId: 1 }, { unique: true });
schema.index({ isVerified: 1 });
schema.index({ "offer.isActive": 1 });
schema.index({ autoLocation: "2dsphere" });
export default mongoose.model("Restaurant", schema);
