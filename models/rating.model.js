const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
{
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ride",
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Captain",
        required: true
    },

    comfort: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    price: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    safety: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    behavior: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
},
{
    timestamps: true
});

module.exports = mongoose.model(
    "Rating",
    ratingSchema
);