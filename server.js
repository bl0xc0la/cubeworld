const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let games = [
    { id: 1, name: "CubeCity", creator: "System", players: 120 }
];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 🛡️ OWNER BYPASS: BloxColaYT always gets in with Infinite Cubes
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞" };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
    }

    if (accounts[username] && accounts[username].pass !== password) {
        return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    if (!accounts[username]) accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
});

io.on("connection", (socket) => {
    // Send current games to new connections
    socket.emit("update-games", games);

    socket.on("publish-game", (data) => {
        const newGame = { id: Date.now(), name: data.name, creator: data.creator, players: 0 };
        games.push(newGame);
        io.emit("update-games", games);
    });

    socket.on("send-msg", (data) => io.emit("new-msg", data));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`CubeWorld Engine Online: Port ${PORT}`));
