const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let publishedGames = [
    { id: '1', name: "CubeCity Classic", creator: "System", logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150" }
];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 🛡️ OWNER CONTROL BYPASS
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞", theme: "roblox" };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞", theme: "roblox" });
    }

    if (!accounts[username]) {
        accounts[username] = { pass: password, role: "User", cubes: 500, theme: "roblox" };
    }
    
    res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes, theme: accounts[username].theme });
});

io.on("connection", (socket) => {
    socket.emit("sync-games", publishedGames);

    socket.on("global-msg", (data) => io.emit("global-receive", data));

    // Private Messaging Engine Route
    socket.on("send-pm", (data) => {
        io.emit("pm-receive", data); 
    });

    // Studio Core: Create & Publish
    socket.on("publish-game", (data) => {
        const gameLogo = data.logo.trim() !== "" ? data.logo : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150";
        publishedGames.push({ id: Date.now().toString(), name: data.name, creator: data.user, logo: gameLogo });
        io.emit("sync-games", publishedGames);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`CubeWorld V4 Server Running on Port ${PORT}`));
