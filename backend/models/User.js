// backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);


