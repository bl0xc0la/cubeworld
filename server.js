const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/cubeworld');

// Maintenance Mode Flag
let maintenanceMode = false;

// Models
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    cubebucks: { type: Number, default: 100 },
    inventory: { type: Array, default: [] },
    isBanned: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    lastDaily: { type: Date, default: null }
}));

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    parts: Array
}));

// Admin Middleware Check
const checkAdmin = async (req, res, next) => {
    const user = await User.findOne({ username: req.headers.username, isAdmin: true });
    if (!user) return res.status(403).send("Forbidden");
    next();
};

// API Routes
app.post('/api/daily-claim', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    const now = new Date();
    if (user.lastDaily && (now - user.lastDaily) < 86400000) return res.status(400).send("Try again tomorrow");
    user.cubebucks += 50;
    user.lastDaily = now;
    await user.save();
    res.json({ balance: user.cubebucks });
});

app.post('/api/delete-account', async (req, res) => {
    await User.deleteOne({ username: req.body.username });
    res.send("Account Deleted");
});

// Admin API
app.post('/api/admin/action', checkAdmin, async (req, res) => {
    const { action, target, amount } = req.body;
    if (action === 'ban') await User.updateOne({ username: target }, { isBanned: true });
    if (action === 'unban') await User.updateOne({ username: target }, { isBanned: false });
    if (action === 'give') await User.updateOne({ username: target }, { $inc: { cubebucks: amount } });
    if (action === 'maintenance') {
        maintenanceMode = !maintenanceMode;
        io.emit('maintenance-status', maintenanceMode);
    }
    res.send("Action complete");
});

io.on('connection', async (socket) => {
    const games = await Game.find({});
    socket.emit('sync-games', games);

    socket.on('join-session', async (username) => {
        let user = await User.findOne({ username });
        if (!user) user = await User.create({ username, isAdmin: username === 'BloxColaYT' });
        
        if (user.isBanned) return socket.emit('banned');
        socket.username = username;
        socket.emit('user-data', user);
        socket.emit('maintenance-status', maintenanceMode);
    });

    socket.on('publish-game', async (data) => {
        await Game.create(data);
        const allGames = await Game.find({});
        io.emit('sync-games', allGames); // Broadcast to everyone
    });

    socket.on('send-chat', (msg) => {
        io.emit('chat-receive', { user: socket.username, text: msg });
    });
});

http.listen(10000, () => console.log('CubeWorld Backend Online'));
