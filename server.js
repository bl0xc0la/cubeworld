const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let publishedGames = [
    { 
        id: '1', 
        name: "CubeCity Classic", 
        creator: "System", 
        logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
        mapData: [
            { x: -2, y: 0.5, z: -2, color: 0xff0000 },
            { x: 2, y: 0.5, z: 2, color: 0x00ff00 }
        ]
    }
];

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞" };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
    }

    if (!accounts[username]) {
        accounts[username] = { pass: password, role: "User", cubes: 500 };
    }
    
    res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
});

io.on("connection", (socket) => {
    socket.emit("sync-games", publishedGames);

    socket.on("global-msg", (data) => io.emit("global-receive", data));
    socket.on("send-pm", (data) => io.emit("pm-receive", data));

    // Studio Action: Receives real 3D block placements from the builder canvas
    socket.on("publish-game", (data) => {
        const logoUrl = data.logo.trim() !== "" ? data.logo : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150";
        publishedGames.push({ 
            id: Date.now().toString(), 
            name: data.name, 
            creator: data.user, 
            logo: logoUrl,
            mapData: data.mapData 
        });
        io.emit("sync-games", publishedGames);
    });

    // Handle positions for multiplayer movement
    socket.on("join-room", (data) => {
        socket.join(data.roomId);
        io.to(data.roomId).emit("server-msg", { user: "SYSTEM", text: `${data.user} entered the server room.` });
    });

    socket.on("game-chat-send", (data) => {
        io.to(data.roomId).emit("server-msg", { user: data.user, text: data.text });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
