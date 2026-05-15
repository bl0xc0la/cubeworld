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

// --- DATABASE SCHEMA ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cubes: { type: Number, default: 100 },
    role: { type: String, default: "User" },
    friends: [{ type: String }], // List of usernames
    dmHistory: [{ from: String, to: String, text: String, time: { type: Date, default: Date.now } }]
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

mongoose.connect(process.env.MONGO_URL).then(() => console.log("CUBEWORLD ENGINE: ONLINE"));

// --- API ---
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        const role = (username.toLowerCase() === "bloxcolayt") ? "Admin" : user.role;
        res.json({ success: true, user: user.username, cubes: user.cubes, role: role, friends: user.friends });
    } else {
        res.json({ success: false });
    }
});

app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        await User.create({ username, password: hashed });
        res.json({ success: true });
    } catch(e) { res.json({ success: false }); }
});

// --- MULTIPLAYER & DM LOGIC ---
const usersOnline = new Map();

io.on("connection", (socket) => {
    socket.on("register-online", (username) => {
        usersOnline.set(username, socket.id);
        console.log(`${username} is now online`);
    });

    // Handle Private DMs
    socket.on("send-dm", async (data) => {
        const targetSocketId = usersOnline.get(data.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit("receive-dm", { from: data.from, text: data.text });
        }
        // Save to DB (Optional: keep a history)
        await User.updateOne({ username: data.to }, { $push: { dmHistory: data } });
    });

    socket.on("disconnect", () => {
        for (let [user, id] of usersOnline) {
            if (id === socket.id) usersOnline.delete(user);
        }
    });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`SYSTEM LIVE`));
