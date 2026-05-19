const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For hashing
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
require('dotenv').config();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DATABASE CONNECTION
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost/cubeworld';
mongoose.connect(mongoURI).then(() => console.log("DB Locked & Loaded"));

// USER SCHEMA WITH PASSWORD
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    cubebucks: { type: Number, default: 100 }
}));

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    parts: Array,
    createdAt: { type: Date, default: Date.now }
}));

// AUTH LOGIC: Combined Register/Login
app.post('/api/auth/entry', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });

        if (!user) {
            // Register new user
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await User.create({ username, password: hashedPassword });
            return res.json({ user, status: "registered" });
        }

        // Login existing user
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send("Wrong password, buddy.");
        
        res.json({ user, status: "logged_in" });
    } catch (e) {
        res.status(500).send("Server error");
    }
});

app.post('/api/daily-claim', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(404).send();
    user.cubebucks += 50;
    await user.save();
    res.json({ balance: user.cubebucks });
});

// SOCKETS
io.on('connection', (socket) => {
    socket.on('join-session', async (user) => {
        socket.username = user;
        const games = await Game.find();
        socket.emit('sync-games', games);
    });

    socket.on('publish-game', async (data) => {
        await Game.create(data);
        const games = await Game.find();
        io.emit('sync-games', games);
    });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`Secure server on ${PORT}`));
