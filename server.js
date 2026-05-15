// ... existing imports ...
const bans = new Set(); // Simple in-memory ban list (save to DB for production)

io.on("connection", (socket) => {
    // AUTH & PERSISTENCE
    socket.on("check-session", (username) => {
        if (bans.has(username)) socket.emit("banned");
    });

    // GLOBAL NOTIFICATIONS
    socket.on("admin-notify", (msg) => {
        io.emit("global-alert", msg);
    });

    // ADMIN ACTIONS
    socket.on("admin-ban", (target) => {
        bans.add(target);
        io.emit("force-logout", target);
    });

    // GAME CHAT & MULTIPLAYER
    socket.on("join-game", (gameId, username) => {
        socket.join(gameId);
        io.to(gameId).emit("game-chat", { u: "SYSTEM", m: `${username} joined the world.` });
    });

    socket.on("game-msg", (data) => {
        io.to(data.gameId).emit("game-chat", data);
    });

    // ... handle movement and DMs ...
});
