const express = require("express");
const router = express.Router();

const razorpay = require("../../config/razorPay");

router.post("/create-order", async (req, res) => {
    try {

        const { amount } = req.body; // destructuring, same as const amount = req.body.amount;

        // IMPORTANT: Razorpay expects amount in paise (1 INR = 100 paise)
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        console.log(order);
        res.json(order);

    } catch (error) {
        console.log(error);
        res.status(500).send("Error creating order");
    }
});
module.exports = router;