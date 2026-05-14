const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    friends: [String],
    dms: [{ from: String, message: String, time: Date }],
    verified: { type: Boolean, default: false }
});

module.exports = mongoose.model("User", UserSchema);
