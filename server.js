const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// --- IN-MEMORY DATABASE ---
const db = {
    users: {
        "cubeydev": {
            username: "CubeyDev",
            password: "password123",
            bio: "Building games in CubeWorld & Vortex!",
            status: "Developing 3D Studio",
            balance: 2500,
            equippedColor: "#2563eb",
            equippedHat: "Crown",
            friends: ["VoxelKing", "PixelBuilder"],
            createdWorlds: [
                { id: 101, title: "Cube City Outskirts", visits: 1420 }
            ]
        },
        "voxelking": {
            username: "VoxelKing",
            password: "password123",
            bio: "Pro Obby Builder.",
            status: "Testing Multiplayer",
            balance: 1100,
            equippedColor: "#10b981",
            equippedHat: "Shades",
            friends: ["CubeyDev"],
            createdWorlds: []
        }
    },
    savedMaps: []
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', onlinePlayers: wss.clients.size });
});

// Auth Endpoints
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const lower = (username || "").toLowerCase();

    if (db.users[lower]) {
        const user = db.users[lower];
        if (user.password === password) {
            const { password: _, ...userPayload } = user;
            return res.json({ success: true, user: userPayload });
        }
        return res.status(401).json({ success: false, message: "Invalid password" });
    }

    const newUser = {
        username: username || "Guest",
        password: password || "password123",
        bio: "Hello, I am new to CubeWorld!",
        status: "Exploring worlds",
        balance: 1000,
        equippedColor: "#2563eb",
        equippedHat: "None",
        friends: [],
        createdWorlds: []
    };
    db.users[lower] = newUser;
    const { password: _, ...userPayload } = newUser;
    return res.json({ success: true, user: userPayload });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: "Missing credentials" });

    const lower = username.toLowerCase();
    if (db.users[lower]) return res.status(400).json({ success: false, message: "User exists" });

    const newUser = {
        username,
        password,
        bio: "Hello, I am new to CubeWorld!",
        status: "Exploring worlds",
        balance: 1000,
        equippedColor: "#10b981",
        equippedHat: "None",
        friends: [],
        createdWorlds: []
    };
    db.users[lower] = newUser;
    const { password: _, ...userPayload } = newUser;
    return res.json({ success: true, user: userPayload });
});

// Profile & Friends APIs
app.get('/api/profile/:username', (req, res) => {
    const lower = req.params.username.toLowerCase();
    const user = db.users[lower];
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { password: _, ...profileData } = user;
    return res.json({ success: true, profile: profileData });
});

app.post('/api/profile/update', (req, res) => {
    const { username, bio, status, color, hat } = req.body;
    const lower = (username || "").toLowerCase();
    if (!db.users[lower]) return res.status(404).json({ success: false, message: "User not found" });

    if (bio !== undefined) db.users[lower].bio = bio;
    if (status !== undefined) db.users[lower].status = status;
    if (color !== undefined) db.users[lower].equippedColor = color;
    if (hat !== undefined) db.users[lower].equippedHat = hat;

    return res.json({ success: true, user: db.users[lower] });
});

app.post('/api/friends/add', (req, res) => {
    const { username, targetUsername } = req.body;
    const u1 = (username || "").toLowerCase();
    const u2 = (targetUsername || "").toLowerCase();

    if (!db.users[u1] || !db.users[u2]) return res.status(404).json({ success: false, message: "User not found" });

    if (!db.users[u1].friends.includes(db.users[u2].username)) {
        db.users[u1].friends.push(db.users[u2].username);
    }
    if (!db.users[u2].friends.includes(db.users[u1].username)) {
        db.users[u2].friends.push(db.users[u1].username);
    }

    return res.json({ success: true, friends: db.users[u1].friends });
});

// Studio Map Endpoints
app.post('/api/studio/save', (req, res) => {
    const { creator, mapData } = req.body;
    const newMap = { id: Date.now(), creator: creator || "Guest", data: mapData, createdAt: new Date() };
    db.savedMaps.push(newMap);
    return res.json({ success: true, mapId: newMap.id });
});

app.get('/api/studio/maps', (req, res) => {
    res.json({ success: true, maps: db.savedMaps });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- WEBSOCKET REAL-TIME MULTIPLAYER ---
const players = new Map();

function broadcast(data, exceptWs = null) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client !== exceptWs && client.readyState === 1) {
            client.send(payload);
        }
    });
}

wss.on('connection', (ws) => {
    let playerId = Math.random().toString(36).substring(2, 9);

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw);

            if (msg.type === 'JOIN') {
                const playerData = {
                    id: playerId,
                    username: msg.username || `User_${playerId.slice(0, 4)}`,
                    color: msg.color || '#2563eb',
                    hat: msg.hat || 'None',
                    x: (Math.random() - 0.5) * 6,
                    y: 0,
                    z: (Math.random() - 0.5) * 6,
                    rotY: 0,
                    isMoving: false
                };
                players.set(playerId, playerData);

                // Send current room state to joined player
                ws.send(JSON.stringify({
                    type: 'INIT_STATE',
                    selfId: playerId,
                    players: Array.from(players.values())
                }));

                // Notify other clients
                broadcast({ type: 'PLAYER_JOINED', player: playerData }, ws);
            }

            if (msg.type === 'MOVE') {
                const p = players.get(playerId);
                if (p) {
                    p.x = msg.x;
                    p.y = msg.y;
                    p.z = msg.z;
                    p.rotY = msg.rotY;
                    p.isMoving = msg.isMoving;
                    broadcast({ type: 'PLAYER_MOVED', id: playerId, x: p.x, y: p.y, z: p.z, rotY: p.rotY, isMoving: p.isMoving }, ws);
                }
            }

            if (msg.type === 'CHAT') {
                broadcast({
                    type: 'CHAT_MSG',
                    senderId: playerId,
                    sender: msg.sender || 'Guest',
                    text: msg.text
                });
            }
        } catch (e) {
            console.error('[WS Error]', e);
        }
    });

    ws.on('close', () => {
        players.delete(playerId);
        broadcast({ type: 'PLAYER_LEFT', id: playerId });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server live on port ${PORT}`);
});
