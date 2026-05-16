const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/cubeworld');

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    parts: Array,
    date: { type: Date, default: Date.now }
}));

// API to get a specific game's data for joining
app.get('/api/games/:id', async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        res.json(game);
    } catch (err) {
        res.status(404).send("Game not found");
    }
});

io.on('connection', (socket) => {
    Game.find({}).then(games => socket.emit('sync-games', games));

    socket.on('publish-game', async (data) => {
        await Game.create({
            name: data.name,
            creator: data.creator,
            parts: data.parts
        });
        const allGames = await Game.find({});
        io.emit('sync-games', allGames);
    });
});

http.listen(10000, () => console.log('cubeworld engine online'));
