const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.static('public'));

let accounts = {}; // Persistent in-memory DB

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // 🛡️ OWNER OVERRIDE: Automatically grants Owner role to BloxColaYT
    if (username === "BloxColaYT") {
        accounts[username] = { pass: password, role: "Owner", cubes: "∞" };
        return res.json({ success: true, user: username, role: "Owner", cubes: "∞" });
    }

    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ success: true, user: username, role: accounts[username].role, cubes: accounts[username].cubes });
        }
        return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: "User", cubes: 500 });
});

io.on("connection", (socket) => {
    socket.on("global-shout", (data) => io.emit("shout", data));
    socket.on("admin-action", (data) => io.emit("alert", `${data.target} updated by Root.`));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Engine Live: ${PORT}`));
