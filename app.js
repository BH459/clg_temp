const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectToDb = require("./db/db");

const userRoutes = require("./routes/user.route");
const captainRoutes = require("./routes/captain.router");
const mapRoutes = require("./routes/maps.routes");
const rideRoutes = require("./routes/ride.routes"); // NEW
const paymentRoutes = require("./routes/payment.routes");
const ratingRoutes = require("./routes/rating.routes");



const app = express();

connectToDb();

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.get("/", (req, res) => {
    res.send("hello world");
});

app.use("/users", userRoutes);
app.use("/captains", captainRoutes);
app.use("/maps", mapRoutes);
app.use("/rides", rideRoutes); // NEW
app.use("/payments", paymentRoutes);
app.use("/ratings", ratingRoutes);
app.get("/test-captains", async (req, res) => {

    const captainModel = require("./models/captain.model");

    const captains = await captainModel.find();

    res.json(captains);

});

module.exports = app;