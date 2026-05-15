const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// IN-MEMORY DATA (In production, you'd use MongoDB)
const bans = new Set();
const publishedGames = [];

// API: Login logic
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Admin bypass for you
    if (username === "BloxColaYT" && password === "Ilikechips!1") {
        return res.json({ success: true, user: "BloxColaYT", role: "Admin", cubes: 9999 });
    }

    // Default guest login for testing
    if (username && password) {
        return res.json({ success: true, user: username, role: "User", cubes: 500 });
    }

    res.status(401).json({ success: false, message: "Invalid credentials" });
});

// SOCKET.IO LOGIC
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Join a game world
    socket.on("join-game", (data) => {
        if (bans.has(data.username)) {
            socket.emit("banned");
            return;
        }
        socket.join(data.gameId);
        io.to(data.gameId).emit("game-chat", { 
            u: "SYSTEM", 
            m: `${data.username} has entered the world.` 
        });
    });

    // Global Chat
    socket.on("send-chat", (data) => {
        io.emit("new-chat", data);
    });

    // ADMIN: Global Notification
    socket.on("admin-notify", (msg) => {
        io.emit("global-alert", msg);
    });

    // ADMIN: Ban logic
    socket.on("admin-ban", (target) => {
        bans.add(target);
        io.emit("force-logout", target);
        console.log(`User ${target} was banned.`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// Start Server
http.listen(PORT, () => {
    console.log(`CubeWorld Engine running on port ${PORT}`);
});
