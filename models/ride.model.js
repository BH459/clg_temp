const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },

    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      default: null,
    },

    pickup: {
      type: String,
      required: true,
    },

    destination: {
      type: String,
      required: true,
    },

    pickupCoordinates: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },

    destinationCoordinates: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },

    // ===============================
    // VEHICLE TYPE REQUESTED FOR THIS RIDE
    // Must match Captain.vehicle.vehicleType exactly so the
    // socket layer can route the request to the right captains.
    // ===============================
    vehicleType: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: {
        values: ['car', 'moto', 'auto', 'crane'],
        message: 'vehicleType must be one of: car, moto, auto, crane',
      },
    },

    fare: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'],
      default: 'pending',
    },

    distance: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    paymentId: {
      type: String,
      default: null,
    },

    orderId: {
      type: String,
      default: null,
    },

    otp: {
      type: String,
      select: false,
      required: true,
    },

    signature: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ride', rideSchema);
