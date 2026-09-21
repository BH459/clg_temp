const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function connectToDb() {
    try {
        await mongoose.connect(process.env.DB_CONNECT);
        console.log("Connected to database");
    } catch (err) {
        console.log("Database connection error:", err);
    }
}

module.exports = connectToDb;