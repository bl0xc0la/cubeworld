const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let publishedGames = [
    { id: 1, name: "CubeCity", creator: "System", players: 120 }
];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // OWNER BYPASS: BloxColaYT always gets Owner + Infinite Cubes
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞" };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
    }
    if (accounts[username] && accounts[username].pass !== password) {
        return res.status(401).json({ success: false, message: "Invalid Pass" });
    }
    if (!accounts[username]) accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
});

io.on("connection", (socket) => {
    socket.on("publish-game", (gameData) => {
        publishedGames.push(gameData);
        io.emit("new-game-alert", gameData);
    });
    socket.on("send-global-dm", (data) => io.emit("receive-dm", data));
});

http.listen(process.env.PORT || 3000, () => console.log("CubeWorld Engine: Online"));
