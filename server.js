const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const server = http.createServer(app);

// MIDDLEWARE
app.use(express.json());
// This line tells Express to look for your index.html inside the "public" folder
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- DATABASE SCHEMA ---------------- */
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

/* ---------------- DB CONNECTION ---------------- */
// We connect without 'await' so the server starts even if the DB is slow
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err.message));

/* ---------------- API ROUTES ---------------- */

// REGISTER ROUTE
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.json({ success: false, msg: "Missing fields" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.json({ success: false, msg: "Username already taken" });
        }

        // Hash password and save
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.json({ success: true });
    } catch (error) {
        console.error("Register Error:", error);
        res.json({ success: false, msg: "Server error during registration" });
    }
});

// LOGIN ROUTE
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.json({ success: false, msg: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({ success: true, user: user.username });
        } else {
            res.json({ success: false, msg: "Incorrect password" });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.json({ success: false, msg: "Server error during login" });
    }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 CubeWorld Server running on port ${PORT}`);
});
