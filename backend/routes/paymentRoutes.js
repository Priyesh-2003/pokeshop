const express = require("express");
const router = express.Router();
const crypto = require("crypto");
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
router.post("/verify", async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = req.body;

        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature === razorpay_signature) {
            res.json({ message: "Payment successful" });
        } else {
            res.status(400).send("Invalid payment signature");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Error verifying payment");
    }
})
module.exports = router;