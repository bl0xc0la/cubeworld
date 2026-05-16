const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
mongoose.connect(MONGO_URI).then(() => console.log("Database Connected"));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true },
    cubes: { type: Number, default: 1000 },
    theme: { type: String, default: 'dark' }
}));

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    parts: Array,
    sunIntensity: { type: Number, default: 1 }
}));

app.use(express.static('public'));
app.use(express.json());

app.post('/api/login', async (req, res) => {
    const { username } = req.body;
    let user = await User.findOne({ username });
    if (!user) user = await User.create({ username });
    res.json(user);
});

io.on('connection', (socket) => {
    socket.on('join-global', (user) => {
        socket.username = user;
        io.emit('chat-update', { system: true, text: user + ' joined the chat' });
    });

    socket.on('send-chat', (msg) => {
        io.emit('chat-update', { user: socket.username, text: msg });
    });

    socket.on('publish-game', async (data) => {
        await Game.create(data);
        const games = await Game.find({});
        io.emit('sync-games', games);
    });
});

http.listen(process.env.PORT || 10000);
