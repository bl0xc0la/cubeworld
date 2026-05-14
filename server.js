const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// CONNECT DATABASE
connectDB();

/* -------------------- FRONTEND -------------------- */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* -------------------- API -------------------- */

// REGISTER
app.post("/api/register", async (req, res) => {

    const { username, password } = req.body;

    const exists = await User.findOne({ username });

    if (exists) {
        return res.json({ success: false, message: "User exists" });
    }

    const user = new User({
        username,
        password
    });

    await user.save();

    res.json({ success: true });

});

// LOGIN
app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (!user) {
        return res.json({ success: false });
    }

    res.json({
        success: true,
        user
    });

});

// STATUS CHECK
app.get("/api/status", (req, res) => {
    res.json({ online: true });
});

/* -------------------- START -------------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("CubeWorld running");
});
