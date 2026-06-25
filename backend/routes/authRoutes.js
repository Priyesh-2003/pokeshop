const express = require("express");
const User = require('../models/User');
const bcrypt = require("bcrypt");
const router = express.Router();
const jwt = require("jsonwebtoken");
// require("dotenv").config();

// verifies user against user DB
router.post("/login", async (req, res) => {

    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username
            },
            process.env.JWT_SECRET
        );
        console.log("jwt token: ", token);
        return res.status(200).json({
            message: "Login successful",
            token
        });

    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
})



router.post("/signIn", async (req, res) => {
    const { username, password } = req.body;

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message:
                "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character."
        });
    }


    try {

        const hashedPassword =
            await bcrypt.hash(password, 10);

        req.body.password = hashedPassword;
        const newUser = await User.create(req.body);
        // res.status(201).json(newUser);

        const token = jwt.sign(
            {
                userId: newUser._id,
                username: newUser.username
            },
            process.env.JWT_SECRET
        );
        console.log("jwt token: ", token);
        return res.status(200).json({
            message: "Login successful",
            token
        });

    } catch (err) {
        console.error(' Error creating user:', err);
        res.status(400).json({ error: err.message });
    }
    console.log("Login request received");
    console.log(req.body);
});

router.get('/test', (req, res) => {
    res.json({ message: 'Auth route test OK' });
});

module.exports = router;