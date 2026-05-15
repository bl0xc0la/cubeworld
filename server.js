const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {
    "BloxColaYT": { pass: "admin123", role: "Owner", cubes: Infinity }
};

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 🛡️ OWNER AUTO-FIX: Force login for your account
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: Infinity };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
    }

    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
        }
        return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: "User", cubes: 500 });
});

io.on("connection", (socket) => {
    socket.on("admin-cmd", (data) => {
        // Broadcaster for bans/promotions
        io.emit("global-alert", `${data.target} updated.`);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server live on ${PORT}`));
