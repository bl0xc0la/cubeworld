const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ---------------- SOCKET.IO MUST BE ATTACHED BEFORE LISTEN ---------------- */
io.on("connection", (socket) => {
    console.log("user connected");

    socket.on("joinGame", (gameId) => {
        socket.join(gameId);
    });
});

/* ---------------- TEST ROUTE ---------------- */
app.get("/api/status", (req, res) => {
    res.json({ online: true });
});

/* ---------------- LOGIN ROUTES (fix your 404) ---------------- */
app.post("/api/auth/login", (req, res) => {
    res.json({ success: true, user: req.body.username });
});

app.post("/api/auth/register", (req, res) => {
    res.json({ success: true });
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("CubeWorld running");
});
