const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    friends: [String],
    cubes: { type: Number, default: 500 }
});
const User = mongoose.model('User', UserSchema);

const Message = mongoose.model('Message', new mongoose.Schema({
    from: String, to: String, text: String, timestamp: { type: Date, default: Date.now }
}));

const Game = mongoose.model('Game', new mongoose.Schema({
    name: String, creator: String, mapData: Array
}));

app.use(express.static('public'));
app.use(express.json());

io.on("connection", (socket) => {
    socket.on("join", async (username) => {
        socket.username = username;
        const u = await User.findOneAndUpdate({ username }, { username }, { upsert: true, new: true });
        socket.emit("user-data", u);
    });

    socket.on("send-dm", async (data) => {
        const msg = new Message(data);
        await msg.save();
        io.emit(`dm-${data.to}`, data);
    });

    socket.on("add-friend", async ({ user, friend }) => {
        await User.updateOne({ username: user }, { $addToSet: { friends: friend } });
        const updated = await User.findOne({ username: user });
        socket.emit("user-data", updated);
    });

    socket.on("publish", async (game) => {
        await new Game(game).save();
        const games = await Game.find({});
        io.emit("sync-games", games);
    });
});

http.listen(process.env.PORT || 10000);
