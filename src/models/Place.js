import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    // Nombre del sitio
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Descripción breve
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Ubicación geográfica obligatoria
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: (val) =>
            Array.isArray(val) &&
            val.length === 2 &&
            !isNaN(val[0]) &&
            !isNaN(val[1]),
          message: "Las coordenadas deben ser [lng, lat]",
        },
      },
    },

    // Nota media del sitio
    avgRating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },

    // ⚠️ CAMPO NUEVO: número de reviews
    reviewsCount: {
      type: Number,
      default: 0,
    },

    // ⚠️ CAMPO NUEVO: IDs de reviews que pertenecen a este lugar
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      }
    ]
  },
  { timestamps: true }
);

// Índice geoespacial obligatorio
placeSchema.index({ location: "2dsphere" });

// Índice simple para búsquedas por nombre
placeSchema.index({ title: "text" });

export default mongoose.model("Place", placeSchema);
