import mongoose, { type Document, Schema } from "mongoose";

interface ICartItem {
  _id?: mongoose.Types.ObjectId;
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  restaurantId?: mongoose.Types.ObjectId;
  restaurantName?: string;
  deliveryFee: number;
  items: ICartItem[];
}

const cartItemSchema = new Schema<ICartItem>({
  menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
  notes: { type: String },
});

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    restaurantName: { type: String },
    deliveryFee: { type: Number, default: 0 },
    items: [cartItemSchema],
  },
  { timestamps: true },
);

export const Cart = mongoose.model<ICart>("Cart", cartSchema);
