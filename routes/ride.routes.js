const express = require("express");
const router = express.Router();

const { body, query } = require("express-validator");

const authMiddleware = require("../middlewares/auth.middleware");
const rideController = require("../controllers/ride.controller");

router.post(
    "/create",
    authMiddleware.authUser,
    body("pickup").isString().isLength({ min: 3 }),
    body("destination").isString().isLength({ min: 3 }),
    body("vehicleType").isString(),
    rideController.createRide
);

router.get(
    "/get-fare",
    authMiddleware.authUser,
    query("pickup").isString().isLength({ min: 3 }),
    query("destination").isString().isLength({ min: 3 }),
    rideController.getFare
);

router.post(
    "/accept",
    authMiddleware.authCaptain,
    body("rideId").isString(),
    rideController.acceptRide
);

router.post(
    "/verify-otp",
    authMiddleware.authCaptain,
    body("rideId").isString(),
    body("otp").isLength({ min: 6, max: 6 }),
    rideController.verifyOtp
);

module.exports = router;