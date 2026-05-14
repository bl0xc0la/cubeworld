const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

const User = require("./models/User");
const World = require("./models/World");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ---------------- DB ---------------- */
mongoose.connect(process.env.MONGO_URL);

/* ---------------- AUTH ---------------- */
app.post("/api/register", async (req, res) => {

    const { username, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
        username,
        email,
        password: hashed,
        friends: [],
        dms: [],
        verified: true
    });

    res.json({ success: true });
});

app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false });

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) return res.json({ success: false });

    res.json({ success: true, user: user.username });
});

/* ---------------- FRIENDS ---------------- */
app.post("/api/friend/add", async (req, res) => {

    const { user, friend } = req.body;

    await User.updateOne(
        { username: user },
        { $addToSet: { friends: friend } }
    );

    res.json({ success: true });
});

/* ---------------- DMS ---------------- */
app.post("/api/dm/send", async (req, res) => {

    const { from, to, message } = req.body;

    await User.updateOne(
        { username: to },
        {
            $push: {
                dms: {
                    from,
                    message,
                    time: new Date()
                }
            }
        }
    );

    res.json({ success: true });
});

/* ---------------- WORLD SAVE ---------------- */
app.post("/api/world/save", async (req, res) => {

    const { gameId, owner, data } = req.body;

    await World.findOneAndUpdate(
        { gameId },
        { owner, data, updatedAt: new Date() },
        { upsert: true }
    );

    res.json({ success: true });
});

app.get("/api/world/:id", async (req, res) => {

    const world = await World.findOne({ gameId: req.params.id });

    res.json(world || {});
});

/* ---------------- MULTIPLAYER ---------------- */
io.on("connection", (socket) => {

    socket.on("join", (room) => {
        socket.join(room);
    });

    socket.on("update", (data) => {
        io.to(data.room).emit("update", data);
    });

});

server.listen(process.env.PORT || 3000, () => {
    console.log("CubeWorld v4 running");
});
