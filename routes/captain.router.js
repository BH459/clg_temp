const express = require('express');
const router = express.Router();
const { body } = require("express-validator");

const captainController = require("../controllers/captain.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const VALID_EMAIL_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com"
];

router.post(
    "/register",
    [

        body("fullname.firstname")
            .isLength({ min: 3 })
            .withMessage(
                "Firstname should be at least 3 characters"
            ),

        body("email")
            .isEmail()
            .withMessage("Invalid email format")
            .custom((email) => {

                const domain =
                    email.split("@")[1]?.toLowerCase();

                if (
                    !VALID_EMAIL_DOMAINS.includes(domain)
                ) {
                    throw new Error(
                        "Only Gmail, Yahoo, Outlook and Hotmail emails are allowed"
                    );
                }

                return true;
            }),

        body("password")
            .isLength({ min: 8 })
            .withMessage(
                "Password must be at least 8 characters"
            )
            .matches(/[A-Z]/)
            .withMessage(
                "Password must contain one uppercase letter"
            )
            .matches(/[a-z]/)
            .withMessage(
                "Password must contain one lowercase letter"
            )
            .matches(/[0-9]/)
            .withMessage(
                "Password must contain one number"
            )
            .matches(/[@$!%*?&#^()_\-+=]/)
            .withMessage(
                "Password must contain one special character"
            ),

        body("vehicle.color")
            .isLength({ min: 3 })
            .withMessage(
                "Vehicle color should be at least 3 characters"
            ),

        body("vehicle.plate")
            .isLength({ min: 3 })
            .withMessage(
                "Vehicle plate should be at least 3 characters"
            ),

        body("vehicle.capacity")
            .isInt({ min: 1 })
            .withMessage(
                "Vehicle capacity should be at least 1"
            ),

        body("vehicle.vehicleType")
            .isIn(["car", "bike", "auto"])
            .withMessage(
                "Invalid vehicle type"
            )

    ],
    captainController.registerCaptain
);

router.post(
    "/login",
    [

        body("email")
            .isEmail()
            .withMessage(
                "Invalid email format"
            ),

        body("password")
            .isLength({ min: 8 })
            .withMessage(
                "Password must be at least 8 characters"
            )

    ],
    captainController.loginCaptain
);

router.get(
    "/profile",
    authMiddleware.authCaptain,
    captainController.getCaptainProfile
);

router.get(
    "/logout",
    authMiddleware.authCaptain,
    captainController.logoutCaptain
);

router.post(
    "/update-stats",
    (req, res, next) => {
        console.log("UPDATE-STATS ROUTE HIT");
        next();
    },
    authMiddleware.authCaptain,
    captainController.updateStats
);

module.exports = router;