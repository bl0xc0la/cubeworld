const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/cubeworld');

// User Model with Password
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    cubebucks: { type: Number, default: 100 },
    isBanned: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false }
}));

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            username, 
            password: hashedPassword,
            isAdmin: username === 'BloxColaYT' // Auto-admin for you
        });
        res.status(201).json({ username: user.username, isAdmin: user.isAdmin });
    } catch (err) {
        res.status(400).send("Username already exists");
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid credentials");
    if (user.isBanned) return res.status(403).send("You are banned");

    res.json({ username: user.username, isAdmin: user.isAdmin, cubebucks: user.cubebucks });
});

// Admin and Game routes remain the same...

io.on('connection', (socket) => {
    socket.on('join-session', (username) => {
        socket.username = username;
        console.log(`${username} connected to CubeWorld`);
    });
    // ... other socket logic
});

http.listen(10000, () => console.log('CubeWorld Auth Server Online'));
