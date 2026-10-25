import mongoose from "mongoose";

export const CATEGORIES = ["ac", "cleaning", "painting", "plumbing", "electrical", "appliance"];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, default: "" },
    minPrice: { type: Number, required: true, min: 1 },
    maxPrice: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
