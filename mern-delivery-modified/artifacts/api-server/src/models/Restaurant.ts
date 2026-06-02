import mongoose, { type Document, Schema } from "mongoose";

export interface IRestaurant extends Document {
  name: string;
  description?: string;
  cuisine: string;
  image?: string;
  coverImage?: string;
  address: string;
  phone?: string;
  deliveryTime: number;
  deliveryFee: number;
  minOrder: number;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  ownerId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    cuisine: { type: String, required: true },
    image: { type: String },
    coverImage: { type: String },
    address: { type: String, required: true },
    phone: { type: String },
    deliveryTime: { type: Number, required: true, default: 30 },
    deliveryFee: { type: Number, required: true, default: 2.99 },
    minOrder: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isOpen: { type: Boolean, default: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Restaurant = mongoose.model<IRestaurant>(
  "Restaurant",
  restaurantSchema,
);
