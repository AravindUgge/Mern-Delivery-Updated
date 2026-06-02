import mongoose, { type Document, Schema } from "mongoose";

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price: number;
  image?: string;
  restaurantId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  isAvailable: boolean;
  isPopular: boolean;
  isVegetarian: boolean;
  calories?: number;
  prepTime?: number;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "MenuCategory" },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    isVegetarian: { type: Boolean, default: false },
    calories: { type: Number },
    prepTime: { type: Number },
  },
  { timestamps: true },
);

export const MenuItem = mongoose.model<IMenuItem>("MenuItem", menuItemSchema);
