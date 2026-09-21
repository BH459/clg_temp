const express = require('express');
const router = express.Router();
const { body } = require("express-validator");

const userController = require("../controllers/user.constroller");
const authMiddleware = require("../middlewares/auth.middleware");

const VALID_EMAIL_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "proton.me",
    "protonmail.com"
];

router.post(
    "/register",
    [

        body("email")
            .isEmail()
            .withMessage("Invalid email format")
            .custom((email) => {

                const domain =
                    email.split("@")[1]?.toLowerCase();

                if (!VALID_EMAIL_DOMAINS.includes(domain)) {
                    throw new Error(
                        "Only Gmail, Yahoo, Outlook and Hotmail emails are allowed"
                    );
                }

                return true;
            }),

        body("fullname.firstname")
            .isLength({ min: 3 })
            .withMessage(
                "Firstname must be at least 3 characters"
            ),

        body("password")
            .isLength({ min: 8 })
            .withMessage(
                "Password must be at least 8 characters"
            )
            .matches(/[A-Z]/)
            .withMessage(
                "Password must contain at least one uppercase letter"
            )
            .matches(/[a-z]/)
            .withMessage(
                "Password must contain at least one lowercase letter"
            )
            .matches(/[0-9]/)
            .withMessage(
                "Password must contain at least one number"
            )
            .matches(/[@$!%*?&#^()_\-+=]/)
            .withMessage(
                "Password must contain at least one special character"
            )

    ],
    userController.registerUser
);

router.post(
    "/login",
    [

        body("email")
            .isEmail()
            .withMessage("Invalid email"),

        body("password")
            .isLength({ min: 8 })
            .withMessage(
                "Password must be at least 8 characters"
            )

    ],
    userController.loginUser
);

router.get(
    "/profile",
    authMiddleware.authUser,
    userController.getUserProfile
);

router.get(
    "/logout",
    authMiddleware.authUser,
    userController.logoutUser
);

module.exports = router;