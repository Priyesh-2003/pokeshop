// server.js (root)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// 1️⃣ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pokemon')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// 2️⃣ Middleware
app.use(cors());
app.use(express.json());

// 3️⃣ API routes — register BEFORE static, so they always take priority
const cardRoutes = require('./backend/routes/cardRoutes');
app.use('/api/cards', cardRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// 5️⃣ Serve all static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// 5️⃣ Start the server
app.listen(PORT, () => {  
  console.log(`Server listening on http://localhost:${PORT}`);
});