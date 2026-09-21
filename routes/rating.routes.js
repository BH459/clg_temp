const express = require("express");
const router = express.Router();

const ratingController =
require("../controllers/rating.controller");

const authMiddleware =
require("../middlewares/auth.middleware");

router.post(
    "/submit",
    authMiddleware.authUser,
    ratingController.submitRating
);

module.exports = router;