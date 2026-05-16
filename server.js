const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);

// --- SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true },
    cubes: { type: Number, default: 500 },
    isAdmin: { type: Boolean, default: false }, // Manual set in MongoDB for now
    friends: [String],
    inventory: [String]
}));

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String, creator: String, mapData: Array
}));

app.use(express.static('public'));
app.use(express.json());

// --- PLAYER TRACKING ---
let onlinePlayers = {}; 

io.on("connection", (socket) => {
    socket.on("join-server", async (username) => {
        const u = await User.findOne({ username });
        socket.username = username;
        onlinePlayers[username] = { id: socket.id, isAdmin: u?.isAdmin };
        io.emit("update-player-list", Object.keys(onlinePlayers));
    });

    // Private Messaging
    socket.on("send-dm", (data) => { // { to: "Bob", text: "Hi" }
        const target = onlinePlayers[data.to];
        if(target) io.to(target.id).emit("dm-receive", { from: socket.username, text: data.text });
    });

    socket.on("disconnect", () => {
        delete onlinePlayers[socket.username];
        io.emit("update-player-list", Object.keys(onlinePlayers));
    });
});

http.listen(process.env.PORT || 10000);
