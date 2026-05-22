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
            message: `Added ${amount} CubeCoins`,
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
            message: `Deducted ${amount} CubeCoins`,
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
            message: 'Game pub
