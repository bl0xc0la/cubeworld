const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
require('dotenv').config();

// 1. DATABASE CONNECTION (With Safety Timeout)
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing in Render Environment Variables!");
}

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000 
})
.then(() => console.log("📦 Connected to MongoDB Successfully!"))
.catch(err => console.error("❌ MongoDB Connection Failed:", err.message));

// 2. DATA MODELS
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true },
    cubes: { type: Number, default: 500 },
    friends: [String],
    messages: [{ from: String, text: String, date: { type: Date, default: Date.now } }]
}));

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    mapData: Array
}));

// 3. MIDDLEWARE
app.use(express.json());
app.use(express.static('public'));

// 4. API ROUTES (The Login Fix)
app.post('/api/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "Username required" });

        let account = await User.findOne({ username });
        if (!account) {
            account = new User({ username });
            await account.save();
            console.log(`✨ New Account Created: ${username}`);
        }
        res.json({ success: true, user: account });
    } catch (err) {
        console.error("Login API Error:", err);
        res.status(500).json({ error: "Database not responding" });
    }
});

// 5. SOCKET.IO (Friends, DMs, & Studio)
io.on("connection", (socket) => {
    console.log("A user connected");

    // Send games to the user when they connect
    Game.find({}).then(games => socket.emit("sync-games", games));

    // Global Chat
    socket.on("global-msg", (data) => {
        io.emit("chat-update", data);
    });

    // Friend Request / Add
    socket.on("add-friend", async ({ user, target }) => {
        const me = await User.findOne({ username: user });
        if (me && !me.friends.includes(target)) {
            me.friends.push(target);
            await me.save();
            socket.emit("sync-friends", me.friends);
        }
    });

    // Send DM
    socket.on("send-dm", async ({ from, to, text }) => {
        const recipient = await User.findOne({ username: to });
        if (recipient) {
            recipient.messages.push({ from, text });
            await recipient.save();
            io.emit(`dm-receive-${to}`, { from, text });
        }
    });

    // Publish from Studio
    socket.on("publish-game", async (data) => {
        const newGame = new Game(data);
        await newGame.save();
        const all = await Game.find({});
        io.emit("sync-games", all);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Cubeworld running on port ${PORT}`));
