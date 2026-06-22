// backend/models/card.js
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String },            // e.g., "Fire", "Water"
  rarity: { type: String },          // e.g., "Common", "Rare"
  price: { type: Number, default: 0 },
  stock: {type: Number, default: 1},
  // add any other fields you need
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
