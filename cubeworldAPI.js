// cubeworldAPI.js

const express = require('express');
const router = express.Router();

// ============================================
// CUBECOINS SYSTEM
// ============================================

// Get user CubeCoins balance
router.get('/api/user/:username/coins', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await getUserFromDB(username);
        
        res.json({
            success: true,
            username: username,
            coins: user.coins || 1000,
            totalEarned: user.totalEarned || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add CubeCoins to user
router.post('/api/user/:username/coins/add', async (req, res) => {
    try {
        const { username } = req.params;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        const user = await addCoinsToUser(username, amount, reason);

        res.json({
            success: true,
            message: 'Added CubeCoins',
            newBalance: user.coins,
            reason: reason
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Deduct CubeCoins from user
router.post('/api/user/:username/coins/deduct', async (req, res) => {
    try {
        const { username } = req.params;
        const { amount, reason } = req.body;

        const user = await getUserFromDB(username);
        if (user.coins < amount) {
            return res.status(400).json({ success: false, error: 'Insufficient CubeCoins' });
        }

        const updated = await deductCoinsFromUser(username, amount, reason);

        res.json({
            success: true,
            message: 'Deducted CubeCoins',
            newBalance: updated.coins
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GAME PUBLISHING
// ============================================

// Create new game
router.post('/api/games/create', async (req, res) => {
    try {
        const { title, description, author, price, thumbnail } = req.body;

        if (!title || !author) {
            return res.status(400).json({ success: false, error: 'Title and author required' });
        }

        const game = {
            id: Date.now(),
            title: title,
            description: description || '',
            author: author,
            price: price || 0,
            thumbnail: thumbnail || '🎮',
            createdAt: new Date(),
            plays: 0,
            rating: 0,
            data: {},
            published: false
        };

        await saveGameToDB(game);

        res.json({
            success: true,
            message: 'Game created successfully',
            game: game
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Publish game
router.post('/api/games/:gameId/publish', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { studioData } = req.body;

        const game = await getGameFromDB(gameId);
        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        game.data = studioData || {};
        game.published = true;
        game.publishedAt = new Date();

        await updateGameInDB(gameId, game);

        res.json({
            success: true,
            message: 'Game published successfully',
            game: game
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all published games
router.get('/api/games', async (req, res) => {
    try {
        const games = await getPublishedGamesFromDB();
        
        res.json({
            success: true,
            games: games,
            total: games.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user games
router.get('/api/user/:username/games', async (req, res) => {
    try {
        const { username } = req.params;
        const games = await getUserGamesFromDB(username);

        res.json({
            success: true,
            games: games,
            total: games.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update game metadata
router.put('/api/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const updates = req.body;

        const game = await getGameFromDB(gameId);
        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        Object.assign(game, updates);
        await updateGameInDB(gameId, game);

        res.json({
            success: true,
            message: 'Game updated',
            game: game
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete game
router.delete('/api/games/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        await deleteGameFromDB(gameId);

        res.json({
            success: true,
            message: 'Game deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// STUDIO DATA
// ============================================

// Save studio work
router.post('/api/games/:gameId/save', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { studioData } = req.body;

        const game = await getGameFromDB(gameId);
        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        game.data = studioData;
        game.lastSaved = new Date();

        await updateGameInDB(gameId, game);

        res.json({
            success: true,
            message: 'Game saved',
            lastSaved: game.lastSaved
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Load studio data
router.get('/api/games/:gameId/data', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        const game = await getGameFromDB(gameId);
        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }

        res.json({
            success: true,
            data: game.data || {}
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ADMIN SYSTEM
// ============================================

// Get all admins
router.get('/api/admin/list', async (req, res) => {
    try {
        const admins = await getAdminsFromDB();
        
        res.json({
            success: true,
            admins: admins
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add admin
router.post('/api/admin/add', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ success: false, error: 'Username required' });
        }

        const user = await getUserFromDB(username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.isAdmin = true;
        await updateUserInDB(username, user);

        res.json({
            success: true,
            message: username + ' is now an admin',
            user: user
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove admin
router.post('/api/admin/remove', async (req, res) => {
    try {
        const { username } = req.body;

        const user = await getUserFromDB(username);
        user.isAdmin = false;
        await updateUserInDB(username, user);

        res.json({
            success: true,
            message: username + ' is no longer an admin'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ban user
router.post('/api/admin/ban', async (req, res) => {
    try {
        const { username, reason } = req.body;

        const user = await getUserFromDB(username);
        user.banned = true;
        user.banReason = reason;
        user.bannedAt = new Date();
        
        await updateUserInDB(username, user);

        res.json({
            success: true,
            message: username + ' has been banned',
            reason: reason
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Unban user
router.post('/api/admin/unban', async (req, res) => {
    try {
        const { username } = req.body;

        const user = await getUserFromDB(username);
        user.banned = false;
        user.banReason = null;
        
        await updateUserInDB(username, user);

        res.json({
            success: true,
            message: username + ' has been unbanned'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get admin dashboard stats
router.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await getTotalUsersCount();
        const totalGames = await getTotalGamesCount();
        const totalCoins = await getTotalCoinsInCirculation();
        const activePlayers = await getActivePlayersCount();

        res.json({
            success: true,
            stats: {
                totalUsers: totalUsers,
                totalGames: totalGames,
                totalCoins: totalCoins,
                activePlayers: activePlayers,
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get reports
router.get('/api/admin/reports', async (req, res) => {
    try {
        const reports = await getReportsFromDB();
        
        res.json({
            success: true,
            reports: reports
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DATABASE FUNCTIONS
// ============================================

async function getUserFromDB(username) {
    return { username: username, coins: 1000, totalEarned: 0, isAdmin: false };
}

async function addCoinsToUser(username, amount, reason) {
    const user = await getUserFromDB(username);
    user.coins += amount;
    user.totalEarned += amount;
    return user;
}

async function deductCoinsFromUser(username, amount, reason) {
    const user = await getUserFromDB(username);
    user.coins -= amount;
    return user;
}

async function saveGameToDB(game) {
    return game;
}

async function getGameFromDB(gameId) {
    return null;
}

async function updateGameInDB(gameId, game) {
    return game;
}

async function deleteGameFromDB(gameId) {
    return true;
}

async function getPublishedGamesFromDB() {
    return [];
}

async function getUserGamesFromDB(username) {
    return [];
}

async function getAdminsFromDB() {
    return ['BloxColaYT'];
}

async function updateUserInDB(username, user) {
    return user;
}

async function getTotalUsersCount() {
    return 2847;
}

async function getTotalGamesCount() {
    return 156;
}

async function getTotalCoinsInCirculation() {
    return 125200;
}

async function getActivePlayersCount() {
    return 1204;
}

async function getReportsFromDB() {
    return [];
}

module.exports = router;
