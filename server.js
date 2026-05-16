const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory storage for multiplayer positions
let players = {};

io.on('connection', (socket) => {
    socket.on('join-game', (data) => {
        players[socket.id] = {
            id: socket.id,
            username: data.username,
            x: 0, y: 1, z: 0,
            color: '#ffcc00'
        };
        socket.emit('current-players', players);
        socket.broadcast.emit('new-player', players[socket.id]);
    });

    socket.on('move', (pos) => {
        if (players[socket.id]) {
            players[socket.id].x = pos.x;
            players[socket.id].y = pos.y;
            players[socket.id].z = pos.z;
            socket.broadcast.emit('player-moved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('player-left', socket.id);
    });
});

http.listen(10000, () => console.log('CubeWorld Engine Online'));
