app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 🛡️ OWNER BYPASS: If it's you, fix the password and log in immediately
    if (username === "BloxColaYT") {
        // Update memory so the password you just typed becomes the "correct" one
        accounts[username] = { pass: password, role: "Owner", cubes: Infinity };
        return res.json({ 
            success: true, 
            user: username, 
            role: "Owner", 
            cubes: "∞" 
        });
    }

    // 👥 STANDARD USER LOGIC
    if (accounts[username]) {
        if (accounts[username].pass === password) {
            return res.json({ 
                success: true, 
                user: username, 
                role: accounts[username].role, 
                cubes: accounts[username].cubes 
            });
        } else {
            // This is where the 401 was coming from
            return res.status(401).json({ success: false, message: "Invalid Password" });
        }
    }

    // ✨ NEW ACCOUNT AUTO-CREATION
    accounts[username] = { pass: password, role: "User", cubes: 500 };
    res.json({ success: true, user: username, role: "User", cubes: 500 });
});
