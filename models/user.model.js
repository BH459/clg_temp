const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "proton.me",
    "protonmail.com"
];

const userSchema = new mongoose.Schema(
    {
        fullname: {
            firstname: {
                type: String,
                required: true,
                minlength: [3, "First name must be at least 3 characters"]
            },

            lastname: {
                type: String,
                default: ""
            }
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,

            validate: {
                validator: function (email) {

                    const domain =
                        email.split("@")[1]?.toLowerCase();

                    return allowedDomains.includes(domain);

                },

                message:
                    "Please use a valid email provider"
            }
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        socketId: {
            type: String
        }

    },
    {
        timestamps: true
    }
);

userSchema.methods.generateAuthToken =
function () {

    return jwt.sign(
        {
            _id: this._id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "24h"
        }
    );

};

userSchema.methods.comparePassword =
async function (password) {

    return await bcrypt.compare(
        password,
        this.password
    );

};

userSchema.statics.hashPassword =
async function (password) {

    return await bcrypt.hash(
        password,
        10
    );

};

const userModel = mongoose.model(
    "user",
    userSchema
);

module.exports = userModel;