const { validationResult } = require("express-validator");
const rideService = require("../services/ride.service");
const rideModel = require("../models/ride.model");

module.exports.createRide = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {

        const ride =
            await rideService.createRide({

                userId: req.user._id,

                pickup: req.body.pickup,

                destination: req.body.destination,

                vehicleType: req.body.vehicleType

            });

        return res.status(201).json(ride);

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });

    }
};
module.exports.getFare = async (req,res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try{
        const fare = await rideService.getFare(req.query.pickup, req.query.destination, req.query.vehicleType);
        return res.status(200).json({fare});
    }catch(error){
        return res.status(500).json({
            message: error.message
        });
    }

}

module.exports.acceptRide = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {

        const { rideId } = req.body;

        const ride = await rideModel
            .findByIdAndUpdate(
                rideId,
                {
                    captain: req.user._id,
                    status: "accepted"
                },
                {
                    new: true
                }
            )
            .select("+otp")
            .populate("user")
            .populate("captain");

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        return res.status(200).json({
            ride,
            otp: ride.otp
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });

    }
};

module.exports.verifyOtp = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {

        const { rideId, otp } = req.body;

        const ride = await rideModel
            .findById(rideId)
            .select("+otp")
            .populate("user")
            .populate("captain");

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        if (ride.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        ride.status = "ongoing";

        await ride.save();

        return res.status(200).json({
            success: true,
            ride
        });

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });

    }
};