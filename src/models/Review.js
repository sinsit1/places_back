import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  place: { type: mongoose.Schema.Types.ObjectId, ref: "Place", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
