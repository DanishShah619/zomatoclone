import mongoose, { Schema } from "mongoose";
const schema = new Schema({
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
}, {
    timestamps: true,
});
schema.index({ "offer.isActive": 1 });
export default mongoose.model("MenuItem", schema);
