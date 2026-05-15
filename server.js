const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Persistent data (In-memory for now)
const bans = new Set();
const publishedGames = [];

// Auth API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false });

    // Admin check
    if (username === "ColaAdmin" || username === "BloxColaYT") {
        return res.json({ success: true, user: username, role: "Admin" });
    }
    
    res.json({ success: true, user: username, role: "User" });
});

// Socket.io Ecosystem
io.on("connection", (socket) => {
    socket.on("join-main", (username) => {
        if (bans.has(username)) {
            socket.emit("banned_notice");
            return;
        }
        console.log(`${username} joined.`);
    });

    socket.on("send-global-chat", (data) => {
        io.emit("receive-chat", data);
    });

    socket.on("admin-broadcast", (msg) => {
        io.emit("global-notif", msg);
    });

    socket.on("admin-ban-user", (target) => {
        bans.add(target);
        io.emit("kick-user", target);
    });
});

http.listen(PORT, () => console.log(`CubeWorld running on port ${PORT}`));
