const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- UPDATED DATABASE SCHEMA ---------------- */
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cubes: { type: Number, default: 100 }, // Our Currency
    friends: { type: Array, default: [] },
    items: { type: Array, default: ["Standard Head"] }, // Avatar Inventory
    messages: [{ from: String, text: String, date: { type: Date, default: Date.now } }]
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

/* ---------------- DB CONNECTION ---------------- */
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("✅ CubeWorld Engine Connected"))
    .catch(err => console.log("❌ DB Connection Failed:", err.message));

/* ---------------- API ROUTES ---------------- */

// REGISTER
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });
        res.json({ success: true });
    } catch (e) { res.json({ success: false, msg: "User exists" }); }
});

// LOGIN (Returns Currency & Social Data)
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ 
                success: true, 
                user: user.username, 
                cubes: user.cubes, 
                friends: user.friends.length 
            });
        } else {
            res.json({ success: false });
        }
    } catch (e) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Platform live on ${PORT}`));
