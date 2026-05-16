const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
require('dotenv').config();

app.use(express.json());
app.use(express.static('public'));

// 🗄️ CONNECT MONGO DB PERMANENT STORAGE
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cubeworld';
mongoose.connect(MONGO_URI)
    .then(() => console.log("📦 MongoDB Connected Successfully!"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Database Schemas
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "User" },
    cubes: { type: String, default: "500" },
    friends: { type: [String], default: [] }
});
const User = mongoose.model('User', UserSchema);

const GameSchema = new mongoose.Schema({
    name: String,
    creator: String,
    logo: String,
    mapData: Array
});
const Game = mongoose.model('Game', GameSchema);

// Memory tracking tracker for active game rooms only (ephemeral live sync)
let gameServers = {}; 

// Handle Persistent Logins
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let account = await User.findOne({ username });
        
        if (username === "BloxColaYT") {
            if (!account) {
                account = new User({ username, password, role: "Owner", cubes: "∞" });
                await account.save();
            }
            return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
        }

        if (!account) {
            account = new User({ username, password, role: "User", cubes: "500" });
            await account.save();
        }
        
        res.json({ success: true, user: username, role: account.role, cubes: account.cubes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

io.on("connection", async (socket) => {
    let currentRoom = null;
    let currentUser = null;

    // Stream saved database games right to client menu dashboard framework
    try {
        const games = await Game.find({});
        socket.emit("sync-games", games);
    } catch(e) {}

    socket.on("global-msg", (data) => io.emit("global-receive", data));
    socket.on("send-pm", (data) => io.emit("pm-receive", data));

    // Persistent Friends System
    socket.on("add-friend", async (data) => {
        try {
            const me = await User.findOne({ username: data.user });
            if (me && !me.friends.includes(data.target)) {
                me.friends.push(data.target);
                await me.save();
            }
            socket.emit("sync-friends", me ? me.friends : []);
        } catch(e){}
    });

    socket.on("admin-announcement", (msg) => {
        io.emit("global-receive", { from: "SYSTEM ALERT", text: msg });
    });

    // Save Game Pipeline Directly to Cluster
    socket.on("publish-game", async (data) => {
        const logoUrl = data.logo.trim() !== "" ? data.logo : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150";
        try {
            const newGame = new Game({
                name: data.name,
                creator: data.user,
                logo: logoUrl,
                mapData: data.mapData
            });
            await newGame.save();
            
            const allGames = await Game.find({});
            io.emit("sync-games", allGames);
        } catch(e) {}
    });

    // Multiplayer State System Pipeline
    socket.on("join-room", (data) => {
        currentRoom = data.roomId;
        currentUser = data.user;
        socket.join(currentRoom);

        if (!gameServers[currentRoom]) gameServers[currentRoom] = {};
        
        gameServers[currentRoom][socket.id] = {
            id: socket.id,
            name: currentUser,
            x: 0, y: 1, z: 0
        };

        socket.emit("current-room-state", Object.values(gameServers[currentRoom]));
        socket.to(currentRoom).emit("player-joined-server", gameServers[currentRoom][socket.id]);
        io.to(currentRoom).emit("room-players-update", Object.values(gameServers[currentRoom]));
    });

    // Clean Escape Routing to Avoid Ghost Duplicate Avatars disappearing
    socket.on("leave-room-request", () => {
        if (currentRoom && gameServers[currentRoom] && gameServers[currentRoom][socket.id]) {
            delete gameServers[currentRoom][socket.id];
            socket.to(currentRoom).emit("player-left", socket.id);
            io.to(currentRoom).emit("room-players-update", Object.values(gameServers[currentRoom]));
            socket.leave(currentRoom);
            currentRoom = null;
        }
    });

    socket.on("move-player", (data) => {
        if (currentRoom && gameServers[currentRoom] && gameServers[currentRoom][socket.id]) {
            gameServers[currentRoom][socket.id].x = data.x;
            gameServers[currentRoom][socket.id].y = data.y;
            gameServers[currentRoom][socket.id].z = data.z;
            socket.to(currentRoom).emit("player-moved", gameServers[currentRoom][socket.id]);
        }
    });

    socket.on("game-chat-send", (data) => {
        io.to(data.roomId).emit("server-msg", { user: data.user, text: data.text });
    });

    socket.on("get-profile-data", async (targetName) => {
        const account = await User.findOne({ username: targetName });
        const resRole = account ? account.role : "User";
        const resCubes = account ? account.cubes : "500";
        const resFriends = account ? account.friends.length : 0;
        
        socket.emit("profile-data-response", {
            username: targetName,
            role: resRole,
            cubes: resCubes,
            friends: resFriends
        });
    });

    socket.on("disconnect", () => {
        if (currentRoom && gameServers[currentRoom] && gameServers[currentRoom][socket.id]) {
            delete gameServers[currentRoom][socket.id];
            io.to(currentRoom).emit("room-players-update", Object.values(gameServers[currentRoom]));
            io.to(currentRoom).emit("player-left", socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
