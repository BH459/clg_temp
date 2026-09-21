const userModel = require("../models/user.model");

module.exports.createUser = async ({
    firstname,
    lastname,
    email,
    password
}) => {

    if (
        !firstname ||
        !email ||
        !password
    ) {
        throw new Error(
            "All fields are required"
        );
    }

    email = email
        .trim()
        .toLowerCase();

    const existingUser =
        await userModel.findOne({
            email
        });

    if (existingUser) {
        throw new Error(
            "User already exists with this email"
        );
    }

    const user =
        await userModel.create({

            fullname: {
                firstname:
                    firstname.trim(),
                lastname:
                    lastname?.trim() || ""
            },

            email,

            password

        });

    return user;
};

module.exports.findUserByEmail =
async (email) => {

    return await userModel
        .findOne({
            email:
                email
                    .trim()
                    .toLowerCase()
        })
        .select("+password");
};