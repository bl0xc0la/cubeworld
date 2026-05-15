const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static('public'));

// IN-MEMORY DATABASE
const accounts = {}; // Format: { "username": { pass: "123", friends: [], role: "User" } }

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false });

    // Shared Account Logic: If user exists, check pass. If not, create them.
    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ success: true, user: username, role: accounts[username].role });
        } else {
            return res.status(401).json({ success: false, message: "Wrong password for this account." });
        }
    } else {
        // Create new account on the fly
        accounts[username] = { pass: password, friends: [], role: "User" };
        return res.json({ success: true, user: username, role: "User" });
    }
});

io.on("connection", (socket) => {
    socket.on("add-friend", (data) => {
        // Simple mock friend logic
        io.emit("friend-request", data);
    });
});

http.listen(PORT, () => console.log(`CubeCity Engine Live on ${PORT}`));
