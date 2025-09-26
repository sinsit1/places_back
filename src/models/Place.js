import mongoose from "mongoose";

const placeSchema = new mongoose.Schema({
  title: String,
  description: String,
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  avgRating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },

  // 📸 Nuevo campo: fotos del lugar
  photos: {
    type: [String], // array de rutas de imagen
    default: []
  }
}, { timestamps: true });

// 👇 Virtual para poder hacer populate("reviews")
placeSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "place"
});

// Para que los virtuals aparezcan en JSON
placeSchema.set("toObject", { virtuals: true });
placeSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Place", placeSchema);
