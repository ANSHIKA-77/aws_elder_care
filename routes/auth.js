const express = require('express');
const router = express.Router();

const User = require('../models/userModel');

// SIGNUP
router.post('/signup', async (req, res) => {

    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
        return res.status(400).json({ message: "Missing fields" });
    }

    try {

        const newUser = new User({
            name,
            username,
            password,
            role   // ✅ THIS IS THE FIX
        });

        await newUser.save();

        res.json({ message: "User created successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating user" });
    }
});


// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username, password });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        res.json({
            message: "Login successful",
            name: user.name,
            role: user.role 

        });

    } catch (error) {
        res.status(500).json({ message: "Login error" });
    }
});

module.exports = router;