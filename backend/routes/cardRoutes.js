// backend/routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const Card = require('../models/card');
const verifyToken = require("../middleware/verifyToken");

// POST /api/cards   →   add a new Pokémon card (requires login)
router.post('/', verifyToken, async (req, res) => {
  try {
    const newCard = await Card.create(req.body);
    res.status(201).json(newCard);
  } catch (err) {
    console.error(' Error creating card:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/cards/:id   →   update an existing card (requires login)
router.put('/:id',verifyToken, async (req, res) => {
  try {
    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCard) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.json(updatedCard);
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/cards/:id   →   remove a card (requires login)
router.delete('/:id',verifyToken, async (req, res) => {
  try {
    const deletedCard = await Card.findByIdAndDelete(req.params.id);

    if (!deletedCard) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.json({ message: 'Card deleted', id: req.params.id });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards/:id   →   public, anyone can view a single card
router.get('/:id',verifyToken, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cards   →   public, anyone can browse the list
router.get('/',verifyToken, async (req, res) => {
  try {
    const cards = await Card.find();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;