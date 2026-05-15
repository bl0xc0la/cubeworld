const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let publishedGames = [
    { id: '1', name: "CubeCity", creator: "System", players: [] }
];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞" };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
    }
    if (accounts[username] && accounts[username].pass !== password) return res.status(401).json({ success: false });
    if (!accounts[username]) accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
});

io.on("connection", (socket) => {
    socket.emit("sync-games", publishedGames);

    // Global Chat logic
    socket.on("global-send", (data) => io.emit("global-receive", data));

    // Studio: Publish Game
    socket.on("publish", (data) => {
        const newGame = { id: Date.now().toString(), name: data.name, creator: data.user, players: [] };
        publishedGames.push(newGame);
        io.emit("sync-games", publishedGames);
    });

    // Multiplayer: Join Server
    socket.on("join-server", (gameId) => {
        socket.join(gameId);
        io.to(gameId).emit("server-msg", { user: "System", text: `A player joined the server.` });
    });

    // In-Game Live Chat
    socket.on("game-chat-send", (data) => {
        io.to(data.gameId).emit("server-msg", { user: data.user, text: data.text });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`CubeWorld Engine V3 Online`));
