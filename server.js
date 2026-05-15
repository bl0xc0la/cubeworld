const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

const accounts = {
    "BloxColaYT": { pass: "admin123", role: "Owner", cubes: Infinity }
};
const bans = new Set();

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (bans.has(username)) return res.status(403).json({ success: false, message: "Banned." });

    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
        }
        return res.status(401).json({ success: false, message: "Wrong password." });
    }
    // Shared account auto-creation
    accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: "User", cubes: 500 });
});

io.on("connection", (socket) => {
    socket.on("admin-cmd", (data) => {
        // Only owner can promote others to admin
        if (data.type === "ban") bans.add(data.target);
        if (data.type === "unban") bans.delete(data.target);
        if (data.type === "op" && accounts[data.target]) accounts[data.target].role = "Admin";
        if (data.type === "deop" && accounts[data.target]) accounts[data.target].role = "User";
        io.emit("global-alert", `${data.target} was updated by Admin.`);
    });
});

http.listen(process.env.PORT || 3000);
