const userModel = require("../models/user.model");
const captainModel = require("../models/captain.model");
const blacklistTokenModel = require("../models/blacklistToken.model");
const jwt = require("jsonwebtoken");

module.exports.authUser = async (req, res, next) => {

    try {

        const token =
            req.cookies?.token ||
            req.headers.authorization?.split(" ")[1];

        console.log("========== AUTH USER ==========");
        console.log("TOKEN:", token);

        if (!token) {
            return res.status(401).json({
                error: "Unauthorized - No Token"
            });
        }

        const isBlacklisted =
            await blacklistTokenModel.findOne({ token });

        if (isBlacklisted) {
            return res.status(401).json({
                error: "Token Blacklisted"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        console.log("DECODED:", decoded);

        const user =
            await userModel.findById(decoded._id);

        if (!user) {
            return res.status(401).json({
                error: "User Not Found"
            });
        }

        req.user = user;

        next();

    } catch (error) {

        console.log("AUTH USER ERROR:", error.message);

        return res.status(401).json({
            error: error.message
        });

    }

};

module.exports.authCaptain = async (req, res, next) => {

    try {

        console.log("========== AUTH CAPTAIN ==========");

        const token =
            req.cookies?.token ||
            req.headers.authorization?.split(" ")[1];

        console.log("TOKEN:", token);

        if (!token) {

            return res.status(401).json({
                error: "Unauthorized - No Token"
            });

        }

        const isBlacklisted =
            await blacklistTokenModel.findOne({ token });

        console.log("BLACKLISTED:", isBlacklisted);

        if (isBlacklisted) {

            return res.status(401).json({
                error: "Token Blacklisted"
            });

        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        console.log("DECODED:", decoded);

        const captain =
            await captainModel.findById(decoded._id);

        console.log("CAPTAIN FOUND:", captain);

        if (!captain) {

            return res.status(401).json({
                error: "Captain Not Found"
            });

        }

        req.captain = captain;

        next();

    } catch (error) {

        console.log("AUTH CAPTAIN ERROR:", error.message);

        return res.status(401).json({
            error: error.message
        });

    }

};
