const Rating = require("../models/rating.model");
const Captain = require("../models/captain.model");

module.exports.submitRating = async (req, res) => {

    try {

        const {
            rideId,
            captainId,
            comfort,
            price,
            safety,
            behavior,
            overall
        } = req.body;

        const rating = await Rating.create({
            ride: rideId,
            user: req.user._id,
            captain: captainId,
            comfort,
            price,
            safety,
            behavior,
            overall
        });

        const ratings = await Rating.find({
            captain: captainId
        });

        const total =
            ratings.reduce(
                (sum, item) => sum + item.overall,
                0
            );

        const average =
            total / ratings.length;

        await Captain.findByIdAndUpdate(
            captainId,
            {
                averageRating: average,
                ratingCount: ratings.length
            }
        );

        res.status(201).json({
            success: true,
            rating
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};