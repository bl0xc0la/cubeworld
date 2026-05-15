const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let publishedGames = [
    { id: '1', name: "CubeCity Alpha", creator: "System", players: [] }
];

// Master Catalog for Avatar Shop
const shopCatalog = [
    { id: 'hat_valk', name: 'Valkyrie Helm', price: 2500, type: 'Hat' },
    { id: 'hat_fedora', name: 'Midnight Fedora', price: 500, type: 'Hat' },
    { id: 'shirt_neon', name: 'Neon Developer Hoodie', price: 150, type: 'Shirt' },
    { id: 'pant_ice', name: 'Ice Drip Jeans', price: 100, type: 'Pants' }
];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 🛡️ OWNER BYPASS: Force absolute admin control & infinite cash
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞", inventory: ['hat_valk'] };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞", inventory: accounts[username].inventory });
    }

    if (accounts[username] && accounts[username].pass !== password) {
        return res.status(401).json({ success: false });
    }

    if (!accounts[username]) {
        accounts[username] = { pass: password, role: "User", cubes: 500, inventory: [] };
    }
    
    res.json({ 
        success: true, 
        user: username, 
        role: accounts[username].role, 
        cubes: accounts[username].cubes,
        inventory: accounts[username].inventory
    });
});

io.on("connection", (socket) => {
    socket.emit("sync-games", publishedGames);
    socket.emit("sync-catalog", shopCatalog);

    // Global Side Chat
    socket.on("global-send", (data) => io.emit("global-receive", data));

    // Studio Engine: Publish standard items
    socket.on("publish", (data) => {
        const newGame = { id: Date.now().toString(), name: data.name, creator: data.user, players: [] };
        publishedGames.push(newGame);
        io.emit("sync-games", publishedGames);
    });

    // Room Matchmaking
    socket.on("join-server", (gameId) => {
        socket.join(gameId);
        io.to(gameId).emit("server-msg", { user: "SYSTEM", text: `A player has initialized and joined this node.` });
    });

    socket.on("game-chat-send", (data) => {
        io.to(data.gameId).emit("server-msg", { user: data.user, text: data.text });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`CubeWorld V4 Kernel Online`));
