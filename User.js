const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: String,
    password: String,

    friends: [String],

    dms: [
        {
            from: String,
            message: String,
            time: Date
        }
    ],

    verified: Boolean
});

module.exports = mongoose.model("User", UserSchema);
