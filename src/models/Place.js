import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // -------------------------
    // UBICACIÓN GEOESPACIAL
    // -------------------------
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,               // lon, lat
        validate: {
          validator: (val) => val.length === 2,
          message: "Las coordenadas deben tener [lng, lat]",
        },
      },
    },

    // Dirección original de Nominatim (opcional, pero recomendado)
    address: {
      type: String,
      trim: true,
      default: "",
    },

    author: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true,
    },

    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    },

    avgRating: { 
      type: Number, 
      default: 0 
    },

    reviewsCount: { 
      type: Number, 
      default: 0 
    },

    // -------------------------
    // FOTOS
    // -------------------------
    photos: {
      type: [String],
      default: [],
    }
  },
  { timestamps: true }
);

// -------------------------------------------
// HABILITAR VIRTUAL reviews (populate auto)
// -------------------------------------------
placeSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "place",
});

// Incluir virtuals en JSON / objeto
placeSchema.set("toObject", { virtuals: true });
placeSchema.set("toJSON", { virtuals: true });

// -------------------------------------------
// **ÍNDICE GEOESPACIAL: OBLIGATORIO**
// -------------------------------------------
placeSchema.index({ location: "2dsphere" });

// Índice para búsqueda por texto (recomendado)
placeSchema.index({ title: "text", description: "text" });

export default mongoose.model("Place", placeSchema);
