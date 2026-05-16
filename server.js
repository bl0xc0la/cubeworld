const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Fix for Render/Local paths
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Database
mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL)
    .then(() => console.log("Database Online"))
    .catch(err => console.log("DB Error:", err));

const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    cubes: { type: Number, default: 1000 },
    isAdmin: { type: Boolean, default: true },
    theme: { type: String, default: 'dark' }
}));

// Route Fix: Explicitly serve index.html on root access
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join-session', async (name) => {
        socket.username = name;
        let u = await User.findOneAndUpdate({ username: name }, { username: name }, { upsert: true, new: true });
        socket.emit('user-data', u);
        io.emit('chat-msg', { sys: true, text: name + " joined the workspace" });
    });

    socket.on('send-chat', (msg) => {
        io.emit('chat-msg', { user: socket.username, text: msg });
    });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
