const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ---------------- STATE ---------------- */
const games = {};
const users = {};
const admins = ["BloxColaYT"];

/* ---------------- JOIN GAME ---------------- */
io.on("connection", (socket) => {

    socket.on("joinGame", ({ gameId, user }) => {
        socket.join(gameId);

        if (!games[gameId]) {
            games[gameId] = { players: [] };
        }

        games[gameId].players.push(user);

        io.to(gameId).emit("playerList", games[gameId].players);
    });

    /* multiplayer movement */
    socket.on("move", (data) => {
        io.to(data.gameId).emit("playerMove", data);
    });

    /* studio updates */
    socket.on("studioUpdate", (data) => {
        io.to(data.gameId).emit("studioUpdate", data);
    });

});

/* ---------------- ADMIN API ---------------- */
app.post("/api/admin/ban", (req, res) => {
    const { user, admin } = req.body;

    if (!admins.includes(admin)) {
        return res.json({ success: false, message: "not admin" });
    }

    users[user] = "banned";

    res.json({ success: true });
});

app.get("/api/status", (req, res) => {
    res.json({
        online: true,
        players: Object.values(games).reduce((a,b)=>a+b.players.length,0)
    });
});

server.listen(3000, () => console.log("CubeWorld running"));
