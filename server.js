const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
require('dotenv').config();

// 1. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cubeworld';
mongoose.connect(MONGO_URI)
    .then(() => console.log("📦 Database Connected!"))
    .catch(err => console.error("❌ DB Error:", err));

// 2. SCHEMAS (Data Structures)
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    cubes: { type: Number, default: 500 },
    friends: [String],
    inventory: [String] // Store items like 'Red Cap'
});
const User = mongoose.model('User', UserSchema);

const GameSchema = new mongoose.Schema({
    name: String,
    creator: String,
    logo: { type: String, default: "https://via.placeholder.com/150" },
    mapData: Array // The advanced block data
});
const Game = mongoose.model('Game', GameSchema);

const MessageSchema = new mongoose.Schema({
    from: String,
    to: String,
    text: String,
    time: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// 3. SERVER CONFIG
app.use(express.json());
app.use(express.static('public'));

// 4. API ROUTES
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    let account = await User.findOne({ username });
    if (!account) {
        account = new User({ username, password });
        await account.save();
    }
    res.json({ success: true, user: account });
});

// 5. SOCKET ENGINE (Real-time Friends, DMs, & Multiplayer)
io.on("connection", async (socket) => {
    // Initial Sync
    const games = await Game.find({});
    socket.emit("sync-games", games);

    // Friend System
    socket.on("add-friend", async ({ user, target }) => {
        const me = await User.findOne({ username: user });
        if (me && !me.friends.includes(target)) {
            me.friends.push(target);
            await me.save();
            socket.emit("sync-friends", me.friends);
        }
    });

    // Private Messaging (DMs)
    socket.on("send-dm", async (data) => {
        const msg = new Message(data);
        await msg.save();
        io.emit(`dm-receive-${data.to}`, data);
    });

    // Fetch DM History
    socket.on("get-dms", async ({ user, target }) => {
        const history = await Message.find({
            $or: [
                { from: user, to: target },
                { from: target, to: user }
            ]
        }).sort({ time: 1 });
        socket.emit("dm-history", history);
    });

    // Studio Publishing
    socket.on("publish-game", async (data) => {
        const newGame = new Game(data);
        await newGame.save();
        const allGames = await Game.find({});
        io.emit("sync-games", allGames);
    });

    // Multiplayer Sync
    socket.on("join-room", (room) => socket.join(room));
    socket.on("move-player", (data) => {
        socket.to(data.room).emit("player-moved", data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Cubeworld Live on ${PORT}`));
