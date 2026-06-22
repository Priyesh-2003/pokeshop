// backend/routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const Card = require('../models/card');   // ← import the model

// POST /api/cards   →   add a new Pokémon card
router.post('/', async (req, res) => {
  try {
    const newCard = await Card.create(req.body);   // body should match the schema
    res.status(201).json(newCard);
  } catch (err) {
    console.error(' Error creating card:', err);
    res.status(400).json({ error: err.message });
  }
});
// GET /api/cards/:id
router.get('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        message: 'Card not found'
      });
    }

    res.json(card);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
// (Optional) GET all cards – handy for testing
router.get('/', async (_, res) => {
  const cards = await Card.find();
  res.json(cards);
});

module.exports = router;
