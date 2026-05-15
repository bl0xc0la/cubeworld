const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let publishedGames = [{ id: '1', name: "CubeCity", creator: "System" }];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 🛡️ OWNER BYPASS
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞", outfit: "default", inventory: ['valk', 'neon_hoodie'] };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞", outfit: "default" });
    }

    if (!accounts[username]) {
        accounts[username] = { pass: password, role: "User", cubes: 500, outfit: "default", inventory: [] };
    }
    
    res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes, outfit: accounts[username].outfit });
});

io.on("connection", (socket) => {
    socket.emit("sync-games", publishedGames);

    socket.on("global-msg", (data) => io.emit("global-receive", data));

    // Private Message Logic
    socket.on("send-pm", (data) => {
        // In a real app, you'd find the specific socket ID, 
        // for this clone, we broadcast with a "target" tag.
        io.emit("pm-receive", data); 
    });

    socket.on("publish-game", (data) => {
        publishedGames.push({ id: Date.now().toString(), name: data.name, creator: data.user });
        io.emit("sync-games", publishedGames);
    });

    socket.on("wear-item", (data) => {
        if(accounts[data.user]) accounts[data.user].outfit = data.item;
        io.emit("user-style-update", { user: data.user, item: data.item });
    });
});

http.listen(process.env.PORT || 3000, () => console.log("Engine Online"));
