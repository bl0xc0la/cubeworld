const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Mock Database (In a production app, use MongoDB or PostgreSQL)
let users = {}; 

const HCAPTCHA_SECRET = '0x0000000000000000000000000000000000000000'; // Replace with your actual secret key

// Route: Verify Captcha & Login
app.post('/api/auth', async (req, res) => {
    const { username, captchaToken } = req.body;

    if (!username || !captchaToken) {
        return res.status(400).json({ success: false, message: "Missing data" });
    }

    try {
        // 1. Verify hCaptcha with their API
        const response = await axios.post(
            `https://hcaptcha.com/siteverify`,
            new URLSearchParams({
                response: captchaToken,
                secret: HCAPTCHA_SECRET
            })
        );

        if (!response.data.success) {
            return res.status(401).json({ success: false, message: "Invalid Captcha" });
        }

        // 2. Initialize or fetch user
        if (!users[username]) {
            users[username] = {
                username: username,
                balance: 0,
                lastReward: 0,
                groups: [],
                isAdmin: username.toLowerCase() === 'bloxcolayt'
            };
        }

        res.json({ success: true, user: users[username] });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Route: Daily Reward
app.post('/api/daily-reward', (req, res) => {
    const { username } = req.body;
    const user = users[username];

    if (!user) return res.status(404).json({ message: "User not found" });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - user.lastReward > oneDay) {
        user.balance += 100;
        user.lastReward = now;
        return res.json({ success: true, newBalance: user.balance });
    } else {
        return res.status(400).json({ success: false, message: "Too early!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
