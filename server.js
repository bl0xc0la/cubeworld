const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    balance: { type: Number, default: 0 },
    friends: [{ type: String }],
    isAdmin: { type: Boolean, default: false }
});

const GameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    creator: { type: String },
    playerCount: { type: Number, default: 0 },
    assetUrl: { type: String } // For the .dmg launcher to pull
});

const MessageSchema = new mongoose.Schema({
    from: String,
    to: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Game = mongoose.model('Game', GameSchema);
const Message = mongoose.model('Message', MessageSchema);

// --- AUTH WITH PASSWORDS ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = new User({ 
            username, 
            password: hashedPassword,
            isAdmin: username.toLowerCase() === 'bloxcolayt'
        });
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ message: "User exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// --- SOCIAL & GAMES ---
app.get('/api/games', async (req, res) => res.json(await Game.find()));

app.post('/api/friends/add', async (req, res) => {
    const { user, friend } = req.body;
    await User.updateOne({ username: user }, { $addToSet: { friends: friend } });
    res.json({ success: true });
});

// --- REAL-TIME (DMs & Multiplayer) ---
io.on('connection', (socket) => {
    socket.on('join-chat', (username) => socket.join(username));
    
    socket.on('send-dm', async (data) => {
        const msg = new Message(data);
        await msg.save();
        io.to(data.to).emit('receive-dm', data);
    });

    socket.on('player-move', (data) => {
        // Broadcast movement to others in the same game instance
        socket.broadcast.emit('move-update', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`CubeWorld MegaServer on ${PORT}`));
