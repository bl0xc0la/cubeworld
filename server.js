const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

/* ---------------- DB ---------------- */
mongoose.connect(process.env.MONGO_URL);

/* ---------------- USER MODEL ---------------- */
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    verified: Boolean,
    verifyToken: String
});

const User = mongoose.model("User", UserSchema);

/* ---------------- EMAIL SETUP ---------------- */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/* ---------------- REGISTER ---------------- */
app.post("/api/register", async (req, res) => {

    const { username, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);
    const token = Math.random().toString(36).substring(2, 10);

    const user = new User({
        username,
        email,
        password: hashed,
        verified: false,
        verifyToken: token
    });

    await user.save();

    await transporter.sendMail({
        from: "CubeWorld",
        to: email,
        subject: "Verify your account",
        text: `Your code: ${token}`
    });

    res.json({ success: true, message: "Check email for code" });
});

/* ---------------- VERIFY ---------------- */
app.post("/api/verify", async (req, res) => {

    const { email, code } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.verifyToken !== code) {
        return res.json({ success: false });
    }

    user.verified = true;
    await user.save();

    res.json({ success: true });
});

/* ---------------- LOGIN ---------------- */
app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) return res.json({ success: false });

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) return res.json({ success: false });

    if (!user.verified) {
        return res.json({ success: false, message: "not verified" });
    }

    res.json({ success: true, user: user.username });
});

/* ---------------- MULTIPLAYER + STUDIO ---------------- */
io.on("connection", (socket) => {

    socket.on("join", (room) => {
        socket.join(room);
    });

    socket.on("studioUpdate", (data) => {
        io.to(data.room).emit("studioUpdate", data);
    });

    socket.on("move", (data) => {
        io.to(data.room).emit("move", data);
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log("CubeWorld v3 running");
});
