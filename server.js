const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ---------------- MEMORY DB (replace with Mongo later) ---------------- */
const users = [];
const games = [];
const worlds = {};

const admins = ["BloxColaYT"];

/* ---------------- AUTH ---------------- */
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    users.push({ username, password: hashed });

    res.json({ success: true });
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) return res.json({ success: false });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.json({ success: false });

    res.json({ success: true, user: username });
});

/* ---------------- GAMES ---------------- */
app.post("/api/games/create", (req, res) => {
    const { title, creator } = req.body;

    const game = {
        id: Date.now().toString(),
        title,
        creator
    };

    games.push(game);

    res.json(game);
});

app.get("/api/games", (req, res) => {
    res.json(games);
});

/* ---------------- WORLD SAVE (STUDIO) ---------------- */
app.post("/api/world/save", (req, res) => {
    const { gameId, data } = req.body;

    worlds[gameId] = data;

    res.json({ success: true });
});

app.get("/api/world/:id", (req, res) => {
    res.json(worlds[req.params.id] || {});
});

/* ---------------- ADMIN ---------------- */
app.post("/api/admin/ban", (req, res) => {
    const { admin, user } = req.body;

    if (!admins.includes(admin)) {
        return res.json({ success: false });
    }

    users = users.filter(u => u.username !== user);

    res.json({ success: true });
});

/* ---------------- MULTIPLAYER ---------------- */
io.on("connection", (socket) => {

    socket.on("joinGame", ({ gameId, user }) => {
        socket.join(gameId);
        socket.to(gameId).emit("playerJoin", user);
    });

    socket.on("move", (data) => {
        io.to(data.gameId).emit("move", data);
    });

    socket.on("studioUpdate", (data) => {
        io.to(data.gameId).emit("studioUpdate", data);
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("CubeWorld v3 running");
});
