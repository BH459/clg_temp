const rideModel = require("../models/ride.model");
const userModel = require("../models/user.model");
const mapService = require("./maps.service");
const crypto = require("crypto");

module.exports.getFare = async (pickup, destination) => {

    if (!pickup || !destination) {
        throw new Error("Pickup and destination are required");
    }

    const routeData =
        await mapService.getDistanceAndTime(
            pickup,
            destination
        );

    const distance =
        Number(routeData.distanceValue);

    const duration =
        Number(routeData.durationValue);

    const fare = {

        auto: Math.round(
            30 +
            (distance / 1000) * 8 +
            (duration / 60) * 1
        ),

        moto: Math.round(
            20 +
            (distance / 1000) * 5 +
            (duration / 60) * 0.5
        ),

        car: Math.round(
            50 +
            (distance / 1000) * 12 +
            (duration / 60) * 2
        )

    };

    return {
        fare,
        distance,
        duration
    };
};

module.exports.createRide = async ({
    userId,
    pickup,
    destination,
    vehicleType
}) => {

    if (
        !userId ||
        !pickup ||
        !destination ||
        !vehicleType
    ) {
        throw new Error("All fields are required");
    }

    const user = await userModel.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    const fareData =
        await module.exports.getFare(
            pickup,
            destination
        );

    const fare =
        fareData.fare[vehicleType];

    if (!fare) {
        throw new Error("Invalid vehicle type");
    }

    // NEW
    const pickupCoordinates =
        await mapService.getAddressCoordinate(
            pickup
        );

    const destinationCoordinates =
        await mapService.getAddressCoordinate(
            destination
        );

    const otp = module.exports.generateOtp(6);

    const ride = await rideModel.create({

        user: userId,
        captain: null,

        pickup,
        destination,

        // NEW
        pickupCoordinates: {
            lat: pickupCoordinates.lat,
            lng: pickupCoordinates.lng
        },

        destinationCoordinates: {
            lat: destinationCoordinates.lat,
            lng: destinationCoordinates.lng
        },

        fare,

        distance: fareData.distance,
        duration: fareData.duration,

        otp,

        status: "pending",

        paymentId: null,
        orderId: null,
        signature: null
    });

    const populatedRide = await rideModel
        .findById(ride._id)
        .populate({
            path: "user",
            select: "-password"
        });

    return {
        ride: populatedRide,
        otp
    };
};

module.exports.generateOtp = (num = 6) => {

    const min = Math.pow(10, num - 1);
    const max = Math.pow(10, num) - 1;

    return crypto.randomInt(min, max + 1).toString();
};