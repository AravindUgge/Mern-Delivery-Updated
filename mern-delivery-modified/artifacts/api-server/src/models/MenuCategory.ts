import mongoose, { type Document, Schema } from "mongoose";

export interface IMenuCategory extends Document {
  name: string;
  description?: string;
  restaurantId: mongoose.Types.ObjectId;
  sortOrder: number;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const MenuCategory = mongoose.model<IMenuCategory>(
  "MenuCategory",
  menuCategorySchema,
);
