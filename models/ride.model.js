const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },

        captain: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Captain",
            default: null
        },

        pickup: {
            type: String,
            required: true
        },

        destination: {
            type: String,
            required: true
        },

        pickupCoordinates: {
            lat: {
                type: Number,
                default: null
            },
            lng: {
                type: Number,
                default: null
            }
        },

        destinationCoordinates: {
            lat: {
                type: Number,
                default: null
            },
            lng: {
                type: Number,
                default: null
            }
        },

        fare: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "ongoing",
                "completed",
                "cancelled"
            ],
            default: "pending"
        },

        distance: {
            type: Number,
            required: true
        },

        duration: {
            type: Number,
            required: true
        },

        paymentId: {
            type: String,
            default: null
        },

        orderId: {
            type: String,
            default: null
        },

        otp: {
            type: String,
            select: false,
            required: true
        },

        signature: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ride", rideSchema);