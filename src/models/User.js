import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  favorites: [{ type: Schema.Types.ObjectId, ref: 'Place', default: [] }]
}, { timestamps: true });

export default model('User', userSchema);
