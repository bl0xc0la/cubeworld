const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let activePlayers = {};

io.on('connection', (socket) => {
    socket.on('player-join', (userData) => {
        activePlayers[socket.id] = {
            id: socket.id,
            username: userData.username,
            pos: { x: 0, y: 2, z: 0 },
            color: userData.color || '#3b82f6'
        };
        // Tell the new player about everyone else
        socket.emit('current-players', activePlayers);
        // Tell everyone else about the new player
        socket.broadcast.emit('new-player', activePlayers[socket.id]);
    });

    socket.on('update-pos', (pos) => {
        if (activePlayers[socket.id]) {
            activePlayers[socket.id].pos = pos;
            socket.broadcast.emit('player-moved', { id: socket.id, pos: pos });
        }
    });

    socket.on('disconnect', () => {
        delete activePlayers[socket.id];
        io.emit('player-left', socket.id);
    });
});

http.listen(10000, () => console.log('CubeWorld Multiplayer Online'));
