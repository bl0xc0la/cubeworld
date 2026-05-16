const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);

const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    cubes: { type: Number, default: 1000 },
    isAdmin: { type: Boolean, default: true }, // Set to true so you have access
    inventory: { type: Array, default: [] },
    theme: { type: String, default: 'dark' }
}));

// Mock Store Data
const StoreItems = [
    { id: 'red_cap', name: 'Red Classic Cap', price: 150, type: 'hat' }
];

io.on('connection', (socket) => {
    socket.on('get-user', async (name) => {
        const u = await User.findOneAndUpdate({ username: name }, { username: name }, { upsert: true, new: true });
        socket.emit('user-data', u);
    });

    socket.on('buy-item', async ({ username, itemId }) => {
        const item = StoreItems.find(i => i.id === itemId);
        const u = await User.findOne({ username });
        if (u.cubes >= item.price) {
            u.cubes -= item.price;
            u.inventory.push(item.id);
            await u.save();
            socket.emit('user-data', u);
        }
    });
});

http.listen(10000);
