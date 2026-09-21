const captainModel = require("../models/captain.model");
const captainService = require("../services/captain.service");
const blacklistTokenModel = require("../models/blacklistToken.model");
const { validationResult } = require("express-validator");

module.exports.registerCaptain = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const {
        fullname,
        email,
        password,
        vehicle
    } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ email });

    if (isCaptainAlreadyExist) {
        return res.status(400).json({
            message: "Captain with this email already exists"
        });
    }

    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email,
    password: hashedPassword,
    color: vehicle.color,
    plate: vehicle.plate,
    capacity: vehicle.capacity,
    vehicleType: vehicle.vehicleType
});
 
    const token = captain.generateAuthToken();

    res.status(201).json({
        token,
        captain
    });
};

module.exports.loginCaptain = async (req, res) => {

    try {

        console.log("LOGIN BODY:", req.body);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        const captain = await captainModel
            .findOne({ email: email.toLowerCase() })
            .select("+password");

        console.log("CAPTAIN:", captain);

        if (!captain) {
            return res.status(401).json({
                message: "Captain not found"
            });
        }

        const isMatch =
            await captain.comparePassword(password);

        console.log("PASSWORD MATCH:", isMatch);

        if (!isMatch) {
            return res.status(401).json({
                message: "Password incorrect"
            });
        }

        const token =
            captain.generateAuthToken();

        res.status(200).json({
            token,
            captain
        });

    } catch (error) {

        console.log("LOGIN ERROR:", error);

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports.getCaptainProfile = async (req, res, next) => {

    res.status(200).json(req.captain);
};

module.exports.logoutCaptain = async (req, res, next) => {

    const token =
        req.cookies?.token ||
        req.headers.authorization?.split(" ")[1];

    if (token) {
        await blacklistTokenModel.create({ token });
    }

    res.clearCookie("token");

    res.status(200).json({
        message: "Logged out successfully"
    });
};

module.exports.updateStats = async (req, res) => {
    try {

        console.log("REQ CAPTAIN:", req.captain);
        console.log("FARE:", req.body.fare);

        const captain = req.captain;

        captain.totalEarnings =
            Number(captain.totalEarnings || 0) +
            Number(req.body.fare || 0);

        captain.totalTrips =
            Number(captain.totalTrips || 0) + 1;

        await captain.save();

        console.log("UPDATED CAPTAIN:", captain);

        res.status(200).json({
            success: true,
            captain
        });

    } catch (error) {

        console.log("UPDATE STATS ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};