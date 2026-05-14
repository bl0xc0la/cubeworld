const mongoose = require("mongoose");

module.exports = async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("MongoDB connected");
    } catch (err) {
        console.log("MongoDB error:", err);
    }
};
