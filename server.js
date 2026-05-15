const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static('public'));

// IN-MEMORY DATABASE
const accounts = {
    "BloxColaYT": { pass: "Ilikechips!1", role: "Owner", cubes: 999999999, friends: [], dms: [] }
};
const bans = new Set();

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (bans.has(username)) return res.status(403).json({ success: false, message: "You are banned." });

    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
        }
        return res.status(401).json({ success: false, message: "Wrong password." });
    } else {
        // Auto-create account
        accounts[username] = { pass: password, role: "User", cubes: 500, friends: [], dms: [] };
        return res.json({ success: true, user: username, role: "User", cubes: 500 });
    }
});

io.on("connection", (socket) => {
    socket.on("global-msg", (msg) => io.emit("receive-global", msg));
    
    socket.on("admin-action", (data) => {
        if (data.type === "ban") bans.add(data.target);
        if (data.type === "unban") bans.delete(data.target);
        if (data.type === "op") accounts[data.target].role = "Admin";
        if (data.type === "deop") accounts[data.target].role = "User";
        io.emit("sync-admin", { target: data.target, action: data.type });
    });
});

http.listen(PORT, () => console.log(`CubeWorld Master Engine on ${PORT}`));
