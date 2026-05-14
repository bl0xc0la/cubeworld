const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");

const setupSockets = require("./sockets/multiplayer");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

connectDB();

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);

/* SOCKETS */
setupSockets(io);

/* START */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("CubeWorld v2 running"));
