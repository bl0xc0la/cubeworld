const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
require('dotenv').config();

// --- 1. THE FAIL-SAFE CONNECTION ---
// This checks both common naming conventions (URI vs URL)
const MONGO_CONNECTION_STRING = process.env.MONGO_URI || process.env.MONGO_URL;

if (!MONGO_CONNECTION_STRING) {
    console.error("❌ CRITICAL ERROR: No MongoDB string found in Render Environment Variables!");
} else {
    mongoose.connect(MONGO_CONNECTION_STRING, {
        serverSelectionTimeoutMS: 5000 // Stop waiting after 5s to prevent hanging
    })
    .then(() => console.log("📦 SUCCESS: Connected to MongoDB!"))
    .catch(err => console.error("❌ MONGODB ERROR:", err.message));
}

// --- 2. DATA SCHEMAS ---
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

// --- 3. MIDDLEWARE ---
app.use(express.json());
app.use(express.static('public'));

// --- 4. API ROUTES ---
app.post('/api/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "No username" });

        // Wait for DB connection status (1 = connected)
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database starting up... please try again in 5 seconds." });
        }

        let account = await User.findOne({ username });
        if (!account) {
            account = new User({ username });
            await account.save();
        }
        res.json({ success: true, user: account });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// --- 5. SOCKET ENGINE ---
io.on("connection", async (socket) => {
    console.log("User joined the network");

    // Only fetch games if the DB is actually connected
    if (mongoose.connection.readyState === 1) {
        try {
            const games = await Game.find({});
            socket.emit("sync-games", games);
        } catch (e) { console.log("Sync error:", e); }
    }

    socket.on("global-msg", (data) => io.emit("chat-update", data));

    socket.on("send-dm", async ({ from, to, text }) => {
        const recipient = await User.findOne({ username: to });
        if (recipient) {
            recipient.messages.push({ from, text });
            await recipient.save();
            io.emit(`dm-receive-${to}`, { from, text });
        }
    });

    socket.on("publish-game", async (data) => {
        const newGame = new Game(data);
        await newGame.save();
        const all = await Game.find({});
        io.emit("sync-games", all);
    });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`🚀 Cubeworld Engine Live on Port ${PORT}`));
