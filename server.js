// 1. MUST BE AT THE TOP
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
require('dotenv').config();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 2. DATABASE CONNECTION
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost/cubeworld';
mongoose.connect(mongoURI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("DB Error:", err));

// 3. MODELS (Now mongoose is defined, so this won't crash)
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

// 4. API ROUTES
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashedPassword });
        res.json(user);
    } catch (e) { res.status(400).send("User exists"); }
});

app.post('/api/daily-claim', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(404).send();
    user.cubebucks += 50;
    await user.save();
    res.json({ balance: user.cubebucks });
});

app.get('/api/games/:id', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        res.json(game);
    } catch (e) { res.status(404).send("Game not found"); }
});

// 5. SOCKET.IO LOGIC
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

    socket.on('send-chat', (text) => {
        io.emit('chat-receive', { user: socket.username, text });
    });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`cubeworld engine online on port ${PORT}`));
