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

/* ---------------- DATABASE MODELS ---------------- */
// Defined here to avoid "module not found" crashes
const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    friends: [String]
}));

const World = mongoose.models.World || mongoose.model("World", new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    owner: String,
    data: Object
}));

/* ---------------- DB CONNECTION ---------------- */
// We do not 'await' this so the server starts even if DB fails
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Auth Failed: Check your MONGO_URL in Render", err.message));

/* ---------------- ROUTES ---------------- */
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ success: false, msg: "Missing fields" });
        
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashed });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, msg: "Username taken or DB error" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, msg: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        res.json({ success: isMatch, user: user.username });
    } catch (e) {
        res.json({ success: false, msg: "Server error" });
    }
});

/* ---------------- SOCKETS ---------------- */
io.on("connection", (socket) => {
    socket.on("join", (room) => socket.join(room));
    socket.on("update", (data) => io.to(data.room).emit("update", data));
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 CubeWorld v4 Live on port ${PORT}`);
});
