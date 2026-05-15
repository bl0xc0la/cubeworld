const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- DATABASE ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cubes: { type: Number, default: 100 },
    role: { type: String, default: "User" }, // BloxColaYT will be "Admin"
    friends: [{ type: String }],
    inventory: { type: Array, default: [] }
});
const User = mongoose.model("User", userSchema);

mongoose.connect(process.env.MONGO_URL).then(() => console.log("✅ Core Connected"));

// --- AUTH ---
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        // Special Admin Check
        const role = (username.toLowerCase() === "bloxcolayt") ? "Admin" : user.role;
        res.json({ success: true, user: user.username, cubes: user.cubes, role: role });
    } else {
        res.json({ success: false });
    }
});

// --- SOCKETS (Multiplayer & Chat) ---
io.on("connection", (socket) => {
    socket.on("join-game", (data) => {
        socket.join("game1");
        io.to("game1").emit("system-msg", `${data.user} joined the game`);
    });

    socket.on("chat-msg", (data) => {
        io.to("game1").emit("chat-msg", data); // Broadcast to everyone
    });

    socket.on("move", (data) => {
        socket.broadcast.to("game1").emit("player-moved", data);
    });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`🚀 Engine Live`));
