const mongoose = require("mongoose");

const SaveSchema = new mongoose.Schema({
    gameId: String,
    data: Object   // world objects, parts, positions
});

module.exports = mongoose.model("Save", SaveSchema);
