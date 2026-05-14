const mongoose = require("mongoose");

module.exports = async function connectDB(){
    await mongoose.connect(process.env.MONGO_URL);
    console.log("DB connected");
};
