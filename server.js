const express = require("express");
const path = require("path");

let connectDB;

// SAFE IMPORT (won’t crash if file missing)
try {
    connectDB = require("./config/db");
} catch (e) {
    console.log("MongoDB disabled (config/db missing)");
}

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Try DB only if it exists
if (connectDB) {
    connectDB();
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// TEST API
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "CubeWorld running"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("CubeWorld online on port " + PORT);
});
