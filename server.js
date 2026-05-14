const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ---------------- DB CONNECTION ---------------- */
mongoose.connect(process.env.MONGO_URL);

/* ---------------- MODELS ---------------- */
const User = mongoose.model("User", new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: String,
    password: { type: String, required: true },
    friends: [String],
    dms: [{ from: String, message: String, time: Date }],
    verified: { type: Boolean, default: false }
}));

const World = mongoose.model("World", new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    owner: String,
    data: Object,
    updatedAt: { type: Date, default: Date.now }
}));

/* ---------------- AUTH ROUTES ---------------- */
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ username, email, password: hashed, friends: [], dms: [], verified: true });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false });
    const ok = await bcrypt.compare(password, user.password);
    res.json({ success: ok, user: user.username });
});

/* ---------------- WORLD & SOCKETS ---------------- */
app.post("/api/world/save", async (req, res) => {
    const { gameId, owner, data } = req.body;
    await World.findOneAndUpdate({ gameId }, { owner, data, updatedAt: new Date() }, { upsert: true });
    res.json({ success: true });
});

io.on("connection", (socket) => {
    socket.on("join", (room) => socket.join(room));
    socket.on("update", (data) => io.to(data.room).emit("update", data));
});

server.listen(process.env.PORT || 3000, () => console.log("Running!"));
