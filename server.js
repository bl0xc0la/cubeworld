const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // This serves your HTML file from a 'public' folder

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cubeworld';
mongoose.connect(MONGO_URI)
    .then(() => console.log("📦 Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- DATABASE SCHEMAS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    lastReward: { type: Date, default: 0 },
    isAdmin: { type: Boolean, default: false }
});

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    members: { type: Number, default: 1 }
});

const User = mongoose.model('User', UserSchema);
const Group = mongoose.model('Group', GroupSchema);

// --- API ROUTES ---

/**
 * AUTH & REGISTRATION
 * Verifies hCaptcha and finds/creates the user profile.
 */
app.post('/api/auth', async (req, res) => {
    const { username, captchaToken } = req.body;
    const SECRET_KEY = process.env.HCAPTCHA_SECRET;

    if (!username || !captchaToken) return res.status(400).json({ success: false, message: "Missing data" });

    try {
        // 1. Verify hCaptcha
        const verifyUrl = `https://hcaptcha.com/siteverify`;
        const response = await axios.post(verifyUrl, new URLSearchParams({
            response: captchaToken,
            secret: SECRET_KEY
        }));

        if (!response.data.success) {
            return res.status(401).json({ success: false, message: "Captcha verification failed." });
        }

        // 2. Find or Create User
        let user = await User.findOne({ username });
        if (!user) {
            user = new User({
                username: username,
                isAdmin: username.toLowerCase() === 'bloxcolayt' // Automatic Admin logic
            });
            await user.save();
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

/**
 * DAILY REWARDS (CubeCoins)
 */
app.post('/api/daily-reward', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        if (now - user.lastReward > oneDay) {
            user.balance += 100;
            user.lastReward = now;
            await user.save();
            return res.json({ success: true, newBalance: user.balance });
        } else {
            return res.status(400).json({ success: false, message: "Reward already claimed today!" });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

/**
 * GROUPS SYSTEM
 */
app.get('/api/groups', async (req, res) => {
    const groups = await Group.find();
    res.json(groups);
});

app.post('/api/groups', async (req, res) => {
    const { name, owner } = req.body;
    try {
        const newGroup = new Group({ name, owner });
        await newGroup.save();
        res.json({ success: true, group: newGroup });
    } catch (error) {
        res.status(400).json({ success: false, message: "Group name already exists!" });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CubeWorld Backend live on port ${PORT}`);
});
