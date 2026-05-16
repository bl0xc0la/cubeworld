const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; 
let friendsList = {}; // stores username -> array of friend names
let gameServers = {}; // tracks players inside active game rooms
let publishedGames = [
    { 
        id: '1', 
        name: "CubeCity Classic", 
        creator: "System", 
        logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
        mapData: [
            { x: -2, y: 0.6, z: -2, sx: 1.2, sy: 1.2, sz: 1.2, color: "#ff0000" },
            { x: 2, y: 0.6, z: 2, sx: 1.2, sy: 1.2, sz: 1.2, color: "#00ff00" }
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
    let currentRoom = null;
    let currentUser = null;

    socket.emit("sync-games", publishedGames);

    socket.on("global-msg", (data) => io.emit("global-receive", data));
    socket.on("send-pm", (data) => io.emit("pm-receive", data));

    // Friend System Events
    socket.on("add-friend", (data) => {
        if (!friendsList[data.user]) friendsList[data.user] = [];
        if (!friendsList[data.user].includes(data.target)) {
            friendsList[data.user].push(data.target);
        }
        socket.emit("sync-friends", friendsList[data.user]);
    });

    // Admin Panel Trigger Events
    socket.on("admin-announcement", (msg) => {
        io.emit("global-receive", { from: "SYSTEM ALERT", text: msg });
    });

    socket.on("admin-give-cubes", (data) => {
        io.emit("global-receive", { from: "SYSTEM", text: `Admin awarded ${data.amount} Cubes to ${data.target}!` });
    });

    // Studio Save Execution
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

    // Multiplayer Room Logic
    socket.on("join-room", (data) => {
        currentRoom = data.roomId;
        currentUser = data.user;
        socket.join(currentRoom);

        if (!gameServers[currentRoom]) gameServers[currentRoom] = {};
        
        // Save player details
        gameServers[currentRoom][socket.id] = {
            id: socket.id,
            name: currentUser,
            x: 0, y: 1, z: 0
        };

        io.to(currentRoom).emit("room-players-update", Object.values(gameServers[currentRoom]));
        io.to(currentRoom).emit("server-msg", { user: "SYSTEM", text: `${currentUser} connected.` });
    });

    socket.on("move-player", (data) => {
        if (gameServers[currentRoom] && gameServers[currentRoom][socket.id]) {
            gameServers[currentRoom][socket.id].x = data.x;
            gameServers[currentRoom][socket.id].y = data.y;
            gameServers[currentRoom][socket.id].z = data.z;
            socket.to(currentRoom).emit("player-moved", gameServers[currentRoom][socket.id]);
        }
    });

    socket.on("game-chat-send", (data) => {
        io.to(data.roomId).emit("server-msg", { user: data.user, text: data.text });
    });

    socket.on("disconnect", () => {
        if (currentRoom && gameServers[currentRoom] && gameServers[currentRoom][socket.id]) {
            delete gameServers[currentRoom][socket.id];
            io.to(currentRoom).emit("room-players-update", Object.values(gameServers[currentRoom]));
            io.to(currentRoom).emit("player-left", socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
