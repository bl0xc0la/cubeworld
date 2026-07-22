const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
// Render assigns PORT dynamically; fallback to 3000 for local testing
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (index.html, assets, etc.) from the root directory
app.use(express.static(__dirname));

// --- In-Memory Database with Default User ---
let db = {
    users: {
        'CubeyDev': {
            username: 'CubeyDev',
            password: 'password123',
            balance: 1250,
            isAdmin: true,
            equippedColor: '#3b82f6',
            equippedHat: 'Crown',
            inventory: ['Blue Skin', 'Red Skin', 'Emerald Skin', 'Crown', 'Fedora', 'Shades']
        }
    },
    maps: []
};

// --- AUTHENTICATION ROUTES ---

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const user = db.users[username];

    if (user) {
        if (user.password === password) {
            return res.json({ success: true, user });
        } else {
            return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }
    }

    // Auto-create account if user doesn't exist yet
    const newUser = {
        username,
        password: password || '123456',
        balance: 1000,
        isAdmin: false,
        equippedColor: '#3b82f6',
        equippedHat: 'Crown',
        inventory: ['Blue Skin']
    };
    db.users[username] = newUser;

    console.log(`[Auth] Registered & logged in: ${username}`);
    return res.json({ success: true, user: newUser });
});

// Register Route
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required.' });
    }

    if (db.users[username]) {
        return res.status(400).json({ success: false, message: 'User already exists.' });
    }

    const newUser = {
        username,
        password,
        balance: 1000,
        isAdmin: false,
        equippedColor: '#3b82f6',
        equippedHat: 'Crown',
        inventory: ['Blue Skin']
    };

    db.users[username] = newUser;
    console.log(`[Auth] Registered user: ${username}`);
    return res.json({ success: true, user: newUser });
});

// --- STUDIO MAP SAVING ROUTES ---

app.post('/api/studio/save', (req, res) => {
    const { creator, mapData } = req.body;
    db.maps.push({
        id: Date.now(),
        creator: creator || 'Anonymous',
        mapData,
        createdAt: new Date().toISOString()
    });
    console.log(`[Studio] Map saved by ${creator}`);
    return res.json({ success: true, message: 'Map saved to Render cloud!' });
});

app.get('/api/studio/maps', (req, res) => {
    return res.json({ success: true, maps: db.maps });
});

// Serve frontend for all other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Bind server (Crucial for Render: listen on 0.0.0.0 or default)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CubeWorld server live on port ${PORT}`);
});
