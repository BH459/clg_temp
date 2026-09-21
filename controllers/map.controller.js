const mapService = require("../services/maps.service");
const { validationResult } = require("express-validator");

module.exports.getCoordinates = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    const { address } = req.query;

    try {

        const coordinates =
            await mapService.getAddressCoordinate(address);

        return res.status(200).json(coordinates);

    } catch (error) {

        return res.status(404).json({
            message: error.message
        });

    }
};

module.exports.getDistanceByCoordinates = async (
    req,
    res
) => {

    try {

        const {
            originLat,
            originLng,
            destLat,
            destLng
        } = req.query;

        const result =
            await mapService.getDistanceTime(
                originLat,
                originLng,
                destLat,
                destLng
            );

        res.status(200).json(result);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

module.exports.getDistanceTime = async (req, res) => {
    try {

        const { origin, destination } = req.query;

        const result = await mapService.getDistanceAndTime(
            origin,
            destination
        );

        res.status(200).json(result);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

module.exports.getSuggestions = async (req, res) => {

    try {

        const { input } = req.query;

        const suggestions =
            await mapService.getSuggestions(input);

        res.status(200).json(suggestions);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};