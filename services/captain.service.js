const captainModel = require("../models/captain.model");

module.exports.createCaptain = async ({
    firstname,
    lastname,
    email,
    password,
    color,
    plate,
    capacity,
    vehicleType
}) => {

    if (
        !firstname ||
        !email ||
        !password ||
        !color ||
        !plate ||
        !capacity ||
        !vehicleType
    ) {
        throw new Error(
            "All fields are required"
        );
    }

    email = email
        .trim()
        .toLowerCase();

    const existingCaptain =
        await captainModel.findOne({
            email
        });

    if (existingCaptain) {
        throw new Error(
            "Captain already exists with this email"
        );
    }

    const captain =
        await captainModel.create({

            fullname: {
                firstname:
                    firstname.trim(),
                lastname:
                    lastname?.trim() || ""
            },

            email,

            password,

            vehicle: {
                color:
                    color.trim(),

                plate:
                    plate.trim().toUpperCase(),

                capacity,

                vehicleType
            },

            totalEarnings: 0,
            totalTrips: 0,
            hoursOnline: 0

        });

    return captain;
};

module.exports.findCaptainByEmail =
async (email) => {

    return await captainModel
        .findOne({
            email:
                email
                    .trim()
                    .toLowerCase()
        })
        .select("+password");

};