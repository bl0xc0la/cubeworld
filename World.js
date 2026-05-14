const mongoose = require("mongoose");

const WorldSchema = new mongoose.Schema({
    gameId: String,
    owner: String,
    data: Object,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("World", WorldSchema);
