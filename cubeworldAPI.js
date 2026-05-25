// cubeworldAPI.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const GLOBAL_CHAT_FILE = path.join(DATA_DIR, 'global-chat.json');

function ensureDataDir() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
    try {
        ensureDataDir();
        if (!fs.existsSync(file)) return fallback;
        const raw = fs.readFileSync(file, 'utf8');
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeJSON(file, value) {
    ensureDataDir();
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function loadUsers() {
    return readJSON(USERS_FILE, {});
}

function saveUsers(users) {
    writeJSON(USERS_FILE, users);
}

function loadGames() {
    return readJSON(GAMES_FILE, []);
}

function saveGames(games) {
    writeJSON(GAMES_FILE, games);
}

function loadSessions() {
    return readJSON(SESSIONS_FILE, {});
}

function saveSessions(sessions) {
    writeJSON(SESSIONS_FILE, sessions);
}

function loadGlobalChat() {
    return readJSON(GLOBAL_CHAT_FILE, []);
}

function saveGlobalChat(messages) {
    writeJSON(GLOBAL_CHAT_FILE, messages);
}

function ensureUser(username) {
    const users = loadUsers();

    if (!users[username]) {
        users[username] = {
            username,
            coins: 1000,
            totalEarned: 0,
            isAdmin: username === 'BloxColaYT',
            banned: false,
            banReason: null,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
            friends: [],
            games: [],
            createdAt: new Date().toISOString()
        };
        saveUsers(users);
    }

    return users[username];
}

function normalizeGame(game) {
    return {
        id: String(game.id),
        title: game.title || 'Untitled',
        description: game.description || '',
        author: game.author || 'Unknown',
        price: Number(game.price || 0),
        thumbnail: game.thumbnail || 'https://placehold.co/600x400',
        createdAt: game.createdAt || new Date().toISOString(),
        plays: Number(game.plays || 0),
        rating: Number(game.rating || 0),
        data: game.data || {},
        published: Boolean(game.published),
        publishedAt: game.publishedAt || null,
        lastSaved: game.lastSaved || null
    };
}

function upsertGame(nextGame) {
    const games = loadGames();
    const index = games.findIndex(game => String(game.id) === String(nextGame.id));

    if (index === -1) {
        games.push(nextGame);
    } else {
        games[index] = nextGame;
    }

    saveGames(games);
    return nextGame;
}

function removeGame(gameId) {
    const games = loadGames();
    const next = games.filter(game => String(game.id) !== String(gameId));
    saveGames(next);
}

router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CubeWorld is running' });
});

router.get('/api/user/:username/coins', async (req, res) => {
    try {
        const { username } = req.params;
        const user = ensureUser(username);

        res.json({
            success: true,
            username,
            coins: user.coins || 1000,
            totalEarned: user.totalEarned || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/user/:username/coins/add', async (req, res) => {
    try {
        const { username } = req.params;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        const users = loadUsers();
        const user = ensureUser(username);
        user.coins += Number(amount);
        user.totalEarned = Number(user.totalEarned || 0) + Number(amount);
        users[username] = user;
        saveUsers(users);

        res.json({
            success: true,
            message: 'Added CubeCoins',
            newBalance: user.coins,
            reason: reason || ''
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/user/:username/coins/deduct', async (req, res) => {
    try {
        const { username } = req.params;
        const { amount, reason } = req.body;
        const deduction = Number(amount || 0);

        if (!deduction || deduction <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        const users = loadUsers();
        const user = ensureUser(username);
        if (user.coins < deduction) {
            return res.status(400).json({ success: false, error: 'Insufficient CubeCoins' });
        }

        user.coins -= deduction;
        users[username] = user;
        saveUsers(users);

        res.json({
            success: true,
            message: 'Deducted CubeCoins',
            newBalance: user.coins,
            reason: reason || ''
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/games/create', async (req, res) => {
    try {
        const { title, description, author, price, thumbnail } = req.body;

        if (!title || !author) {
            return res.status(400).json({ success: false, error: 'Title and author required' });
        }

        const game = normalizeGame({
            id: Date.now(),
            title,
            description: description || '',
            author,
            price: price || 0,
            thumbnail: thumbnail || 'https://placehold.co/600x400',
            createdAt: new Date().toISOString(),
            plays: 0,
            rating: 0,
            data: {},
            published: false
        });

        upsertGame(game);
        const users = loadUsers();
        const user = ensureUser(author);
        user.games = Array.isArray(user.games) ? user.games : [];
        if (!user.games.includes(String(game.id))) user.games.push(String(game.id));
        users[author] = user;
        saveUsers(users);

        res.json({
            success: true,
            message: 'Game created successfully',
            game
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/games/:gameId/publish', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { studioData } = req.body;
        const games = loadGames();
        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        game.data = studioData || {};
        game.published = true;
        game.publishedAt = new Date().toISOString();
        upsertGame(game);

        res.json({
            success: true,
            message: 'Game published successfully',
            game: normalizeGame(game)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/games', async (req, res) => {
    try {
        const games = loadGames().filter(game => game.published).map(normalizeGame);

        res.json({
            success: true,
            games,
            total: games.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/user/:username/games', async (req, res) => {
    try {
        const { username } = req.params;
        const games = loadGames().filter(game => String(game.author) === String(username)).map(normalizeGame);

        res.json({
            success: true,
            games,
            total: games.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/api/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const updates = req.body || {};
        const games = loadGames();
        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        Object.assign(game, updates);
        upsertGame(game);

        res.json({
            success: true,
            message: 'Game updated',
            game: normalizeGame(game)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/api/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        removeGame(gameId);

        res.json({
            success: true,
            message: 'Game deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/games/:gameId/save', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { studioData } = req.body;
        const games = loadGames();
        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        game.data = studioData || {};
        game.lastSaved = new Date().toISOString();
        upsertGame(game);

        res.json({
            success: true,
            message: 'Game saved',
            lastSaved: game.lastSaved
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/games/:gameId/data', async (req, res) => {
    try {
        const { gameId } = req.params;
        const games = loadGames();
        const game = games.find(g => String(g.id) === String(gameId));

        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        res.json({ success: true, data: game.data || {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/sessions/create', async (req, res) => {
    try {
        const { gameId, username } = req.body || {};
        const games = loadGames();
        const game = games.find(g => String(g.id) === String(gameId) && g.published);

        if (!game) {
            return res.status(404).json({ success: false, error: 'Published game not found' });
        }

        const sessions = loadSessions();
        const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        sessions[sessionId] = {
            id: sessionId,
            gameId: String(gameId),
            createdAt: new Date().toISOString(),
            players: username ? [username] : [],
            state: {
                players: {},
                objects: []
            }
        };

        saveSessions(sessions);

        res.json({
            success: true,
            sessionId,
            joinUrl: `/play/${sessionId}?gameId=${encodeURIComponent(String(gameId))}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessions = loadSessions();
        const session = sessions[sessionId];

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/chat/global', async (req, res) => {
    try {
        res.json({ success: true, messages: loadGlobalChat() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/chat/global', async (req, res) => {
    try {
        const { username, text } = req.body || {};
        if (!text) {
            return res.status(400).json({ success: false, error: 'Message required' });
        }

        const messages = loadGlobalChat();
        const msg = {
            username: username || 'Guest',
            text: String(text).slice(0, 300),
            timestamp: new Date().toISOString()
        };
        messages.push(msg);
        saveGlobalChat(messages.slice(-200));

        res.json({ success: true, message: msg });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/admin/list', async (req, res) => {
    try {
        const users = loadUsers();
        const admins = Object.values(users).filter(user => user.isAdmin).map(user => user.username);

        res.json({ success: true, admins });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/admin/add', async (req, res) => {
    try {
        const { username } = req.body || {};
        if (!username) {
            return res.status(400).json({ success: false, error: 'Username required' });
        }

        const users = loadUsers();
        const user = ensureUser(username);
        user.isAdmin = true;
        users[username] = user;
        saveUsers(users);

        res.json({ success: true, message: `${username} is now an admin`, user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/admin/remove', async (req, res) => {
    try {
        const { username } = req.body || {};
        const users = loadUsers();
        const user = ensureUser(username);
        user.isAdmin = false;
        users[username] = user;
        saveUsers(users);

        res.json({ success: true, message: `${username} is no longer an admin` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/admin/ban', async (req, res) => {
    try {
        const { username, reason } = req.body || {};
        const users = loadUsers();
        const user = ensureUser(username);
        user.banned = true;
        user.banReason = reason || '';
        user.bannedAt = new Date().toISOString();
        users[username] = user;
        saveUsers(users);

        res.json({ success: true, message: `${username} has been banned`, reason: reason || '' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/admin/unban', async (req, res) => {
    try {
        const { username } = req.body || {};
        const users = loadUsers();
        const user = ensureUser(username);
        user.banned = false;
        user.banReason = null;
        user.bannedAt = null;
        users[username] = user;
        saveUsers(users);

        res.json({ success: true, message: `${username} has been unbanned` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/admin/stats', async (req, res) => {
    try {
        const users = Object.values(loadUsers());
        const games = loadGames();
        const totalCoins = users.reduce((sum, user) => sum + Number(user.coins || 0), 0);
        const activePlayers = Object.values(loadSessions()).reduce((sum, session) => sum + (Array.isArray(session.players) ? session.players.length : 0), 0);

        res.json({
            success: true,
            stats: {
                totalUsers: users.length,
                totalGames: games.length,
                totalCoins,
                activePlayers,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/admin/reports', async (req, res) => {
    try {
        res.json({ success: true, reports: [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
