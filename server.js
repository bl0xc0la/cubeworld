const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("📦 Database Connected"))
    .catch(err => console.error("❌ Connection Error:", err));

// --- DATA MODELS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 100 },
    lastReward: { type: Date, default: 0 },
    following: [{ type: String }],
    followers: [{ type: String }],
    isAdmin: { type: Boolean, default: false }
});

const GameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    creator: { type: String, required: true },
    data: { type: Array, default: [] }, // Stores the Three.js block positions
    visits: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Game = mongoose.model('Game', GameSchema);

// --- AUTH SYSTEM ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ 
            username, 
            password: hashed,
            isAdmin: username.toLowerCase() === 'bloxcolayt' 
        });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: "User already exists." }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ message: "Invalid credentials." });
    }
});

// --- STUDIO: SAVE & LOAD ---
app.post('/api/studio/save', async (req, res) => {
    const { title, creator, blocks } = req.body;
    const game = await Game.findOneAndUpdate(
        { title, creator }, 
        { data: blocks }, 
        { upsert: true, new: true }
    );
    res.json({ success: true, game });
});

app.get('/api/games', async (req, res) => {
    const games = await Game.find().sort({ visits: -1 });
    res.json(games);
});

// --- SOCIAL: FOLLOW ---
app.post('/api/social/follow', async (req, res) => {
    const { me, target } = req.body;
    await User.updateOne({ username: me }, { $addToSet: { following: target } });
    await User.updateOne({ username: target }, { $addToSet: { followers: me } });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 CubeWorld running on port ${PORT}`));
