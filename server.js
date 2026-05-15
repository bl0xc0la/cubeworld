const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Middleware to handle JSON and serve your files
app.use(express.json());
app.use(express.static('public'));

// IN-MEMORY DATABASE (Resets when server restarts)
const accounts = {
    "BloxColaYT": { pass: "admin123", role: "Owner", cubes: Infinity }
};
const bans = new Set();

// --- THE FIX: LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 🛡️ OWNER BYPASS: If it's you, fix the password and log in immediately
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: Infinity };
        return res.json({ 
            success: true, 
            user: username, 
            role: "Owner", 
            cubes: "∞" 
        });
    }

    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ 
                success: true, 
                user: username, 
                role: accounts[username].role, 
                cubes: accounts[username].cubes 
            });
        } else {
            return res.status(401).json({ success: false, message: "Invalid Password" });
        }
    }

    // AUTO-CREATE NEW USERS
    accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: "User", cubes: 500 });
});

// --- SOCKET LOGIC ---
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("admin-cmd", (data) => {
        if (data.type === "ban") bans.add(data.target);
        if (data.type === "unban") bans.delete(data.target);
        if (data.type === "op" && accounts[data.target]) accounts[data.target].role = "Admin";
        io.emit("global-alert", `${data.target} status updated.`);
    });

    socket.on("global-msg", (msg) => {
        io.emit("receive-global", msg);
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`CubeWorld Master Engine running on port ${PORT}`);
});
