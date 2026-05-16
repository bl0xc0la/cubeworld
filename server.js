const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// Connect to DB for saving published games
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/cubeworld');

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    parts: Array,
    date: { type: Date, default: Date.now }
}));

io.on('connection', (socket) => {
    // Send existing games on connect
    Game.find({}).then(games => socket.emit('sync-games', games));

    socket.on('publish-game', async (data) => {
        const newGame = await Game.create({
            name: data.name,
            creator: data.creator,
            parts: data.parts
        });
        const allGames = await Game.find({});
        io.emit('sync-games', allGames);
    });

    socket.on('join-game', (user) => {
        socket.broadcast.emit('player-joined', user);
    });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

http.listen(10000, () => console.log('Polytoria-Style Engine Online'));
