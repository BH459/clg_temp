const userModel = require("../models/user.model");
const userService = require("../services/user.serrvice");
const { validationResult } = require("express-validator");
const blacklistTokenModel = require("../models/blacklistToken.model");

module.exports.registerUser = async (req, res) => {
    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        const { fullname, email, password } = req.body;

        const existingUser = await userModel.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                error: "User already exists with this email"
            });
        }

        const hashedPassword =
            await userModel.hashPassword(password);

        const user =
            await userService.createUser({
                firstname: fullname.firstname,
                lastname: fullname.lastname,
                email: email.toLowerCase(),
                password: hashedPassword
            });

        const token = user.generateAuthToken();

        res.status(201).json({
            token,
            user
        });

    } catch (error) {

        console.log("REGISTER ERROR:", error);

        res.status(500).json({
            error: error.message
        });

    }
};

module.exports.loginUser = async (req, res) => {

    try {

        const { email, password } = req.body;

        console.log("LOGIN EMAIL:", email);

        const user = await userService.findUserByEmail(
            email.toLowerCase()
        );

        console.log("USER FOUND:", user);

        if (!user) {

            console.log("USER NOT FOUND");

            return res.status(401).json({
                error: "Invalid email or password"
            });

        }

        const isMatch =
            await user.comparePassword(password);

        console.log("PASSWORD MATCH:", isMatch);

        if (!isMatch) {

            console.log("PASSWORD INCORRECT");

            return res.status(401).json({
                error: "Invalid email or password"
            });

        }

        const token = user.generateAuthToken();

        res.status(200).json({
            token,
            user
        });

    } catch (error) {

        console.log("LOGIN ERROR:", error);

        res.status(500).json({
            error: error.message
        });

    }

};

module.exports.getUserProfile = async (req, res) => {

    res.status(200).json({
        user: req.user
    });

};

module.exports.logoutUser = async (req, res) => {
    try {

        const token =
            req.cookies?.token ||
            req.headers.authorization?.split(" ")[1];

        if (token) {

            await blacklistTokenModel.create({
                token
            });

        }

        res.clearCookie("token");

        res.status(200).json({
            message: "Logged out successfully"
        });

    } catch (error) {

        console.log("LOGOUT ERROR:", error);

        res.status(500).json({
            error: error.message
        });

    }
};