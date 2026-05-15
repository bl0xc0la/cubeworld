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

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cubes: { type: Number, default: 100 },
    role: { type: String, default: "User" },
    friends: [{ type: String }],
    inventory: { type: Array, default: [] }
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("CORE ENGINE ONLINE"))
    .catch(err => console.log("DATABASE OFFLINE:", err.message));

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            const role = (username.toLowerCase() === "bloxcolayt") ? "Admin" : user.role;
            res.json({ success: true, user: user.username, cubes: user.cubes, role: role });
        } else {
            res.json({ success: false });
        }
    } catch (e) { res.json({ success: false }); }
});

app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashed });
        res.json({ success: true });
    } catch (e) { res.json({ success: false, msg: "Account exists" }); }
});

io.on("connection", (socket) => {
    socket.on("join-session", (data) => {
        socket.join("global_lobby");
        io.to("global_lobby").emit("system-log", `${data.user.toUpperCase()} HAS CONNECTED`);
    });

    socket.on("broadcast-chat", (data) => {
        io.to("global_lobby").emit("receive-chat", data);
    });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`SYSTEM ACTIVE ON PORT ${PORT}`));
