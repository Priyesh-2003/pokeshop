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

// PUT /api/cards/:id   →   update an existing card
router.put('/:id', async (req, res) => {
  try {
    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // return the updated doc, re-check schema rules
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

// DELETE /api/cards/:id   →   remove a card
router.delete('/:id', async (req, res) => {
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