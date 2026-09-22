const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const allowedDomains = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
];

const captainSchema = new mongoose.Schema(
  {
    // ===============================
    // CAPTAIN NAME
    // ===============================
    fullname: {
      firstname: {
        type: String,
        required: true,
        minlength: [3, 'First name must be at least 3 characters'],
      },

      lastname: {
        type: String,
        minlength: [3, 'Last name must be at least 3 characters'],
      },
    },

    // ===============================
    // EMAIL
    // ===============================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,

      validate: {
        validator: function (email) {
          const domain = email.split('@')[1];

          return allowedDomains.includes(domain);
        },

        message: 'Please use a valid email provider',
      },
    },

    // ===============================
    // PASSWORD
    // ===============================
    password: {
      type: String,
      required: true,
      select: false,
    },

    // ===============================
    // SOCKET
    // ===============================
    socketId: {
      type: String,
    },

    // ===============================
    // CAPTAIN STATUS
    // ===============================
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // ===============================
    // ADMIN VERIFICATION
    // ===============================
    isVerified: {
      type: Boolean,
      default: false,
    },

    // ===============================
    // VEHICLE
    // ===============================
    vehicle: {
      color: {
        type: String,
        required: true,
        minlength: [3, 'Color should be at least 3 characters'],
      },

      plate: {
        type: String,
        required: true,
        uppercase: true,
        minlength: [3, 'Plate should be at least 3 characters'],
      },

      capacity: {
        type: Number,
        required: true,
        min: [1, 'Capacity should be at least 1'],
      },

      vehicleType: {
        type: String,
        required: true,
        enum: ['car', 'bike', 'auto'],
      },
    },

    // ===============================
    // LOCATION
    // ===============================
    location: {
      lat: {
        type: Number,
      },

      lng: {
        type: Number,
      },
    },

    // ===============================
    // EARNINGS & TRIPS
    // ===============================
    totalEarnings: {
      type: Number,
      default: 0,
    },

    totalTrips: {
      type: Number,
      default: 0,
    },

    hoursOnline: {
      type: Number,
      default: 0,
    },

    // ===============================
    // RATING
    // ===============================
    averageRating: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================
// GENERATE AUTH TOKEN
// =====================================
captainSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h',
    }
  );
};

// =====================================
// COMPARE PASSWORD
// =====================================
captainSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// =====================================
// HASH PASSWORD
// =====================================
captainSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

// =====================================
// CAPTAIN MODEL
// =====================================
const captainModel = mongoose.model('Captain', captainSchema);

module.exports = captainModel;
