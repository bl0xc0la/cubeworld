const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// --- IN-MEMORY DATABASE (Resets on restart, replace with PostgreSQL/Mongo if needed) ---
const db = {
    users: {
        "cubeydev": {
            username: "CubeyDev",
            password: "password123",
            balance: 2500,
            isAdmin: true,
            equippedColor: "#3b82f6",
            equippedHat: "Crown"
        }
    },
    savedMaps: []
};

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// 1. Serve static files from the /public folder
app.use(express.static(path.join(__dirname, 'public')));

// --- REST API ENDPOINTS ---

// Health Check (Used by Render monitor)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Auth: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const lowerUser = (username || "").toLowerCase();

    if (db.users[lowerUser]) {
        const user = db.users[lowerUser];
        if (user.password === password) {
            const { password, ...userWithoutPass } = user;
            return res.json({ success: true, user: userWithoutPass });
        }
        return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // Auto-create user if non-existent (convenient for testing)
    const newUser = {
        username: username || "Guest",
        password: password || "password123",
        balance: 1000,
        isAdmin: lowerUser === 'cubeydev',
        equippedColor: "#3b82f6",
        equippedHat: "None"
    };
    db.users[lowerUser] = newUser;

    const { password: _, ...userPayload } = newUser;
    return res.json({ success: true, user: userPayload });
});

// Auth: Register
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
    }

    const lowerUser = username.toLowerCase();
    if (db.users[lowerUser]) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    const newUser = {
        username,
        password,
        balance: 1000,
        isAdmin: lowerUser === 'cubeydev',
        equippedColor: "#10b981",
        equippedHat: "None"
    };

    db.users[lowerUser] = newUser;
    const { password: _, ...userPayload } = newUser;
    return res.json({ success: true, user: userPayload });
});

// Studio: Save 3D Map
app.post('/api/studio/save', (req, res) => {
    const { creator, mapData } = req.body;
    if (!mapData) return res.status(400).json({ success: false, message: "No map data provided" });

    const newMap = {
        id: Date.now(),
        creator: creator || "Anonymous",
        data: mapData,
        createdAt: new Date()
    };

    db.savedMaps.push(newMap);
    console.log(`[Studio] Map saved by ${creator}. Total maps: ${db.savedMaps.length}`);
    return res.json({ success: true, mapId: newMap.id });
});

// Studio: Fetch Saved Maps
app.get('/api/studio/maps', (req, res) => {
    return res.json({ success: true, maps: db.savedMaps });
});

// 2. Fallback: Catch-all route serving /public/index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- REAL-TIME WEBSOCKET MULTIPLAYER HUB ---
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(2, 9);
    clients.set(ws, { id: clientId, x: 0, y: 0, z: 0 });

    console.log(`[WebSocket] Client connected: ${clientId} (${clients.size} online)`);

    // Broadcast connected client ID
    ws.send(JSON.stringify({ type: 'INIT', id: clientId }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Relay position updates or custom actions to all other connected clients
            if (data.type === 'MOVE' || data.type === 'CHAT') {
                const payload = JSON.stringify({ ...data, sender: clientId });
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === 1) {
                        client.send(payload);
                    }
                });
            }
        } catch (e) {
            console.error('[WebSocket] Failed to parse message', e);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`[WebSocket] Client disconnected: ${clientId} (${clients.size} online)`);
    });
});

// --- START SERVER ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`===========================================`);
    console.log(`🚀 CubeWorld Server live on port ${PORT}`);
    console.log(`📁 Static files target: ${path.join(__dirname, 'public')}`);
    console.log(`===========================================`);
});
