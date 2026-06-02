import mongoose, { type Document, Schema } from "mongoose";

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  restaurantId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true },
);

reviewSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
