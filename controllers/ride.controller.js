const { validationResult } = require('express-validator');

const rideService = require('../services/ride.service');
const rideModel = require('../models/ride.model');
const { sendMessageToSocketid } = require('../soket');

// ======================================================
// CREATE RIDE
// ======================================================
module.exports.createRide = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    if (!req.user?._id) {
      return res.status(401).json({
        message: 'User authentication missing',
      });
    }

    const ride = await rideService.createRide({
      userId: req.user._id,

      pickup: req.body.pickup,

      destination: req.body.destination,

      vehicleType: req.body.vehicleType,
    });

    return res.status(201).json(ride);
  } catch (error) {
    console.error('CREATE RIDE ERROR:', error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// GET FARE
// ======================================================
module.exports.getFare = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const fare = await rideService.getFare(
      req.query.pickup,
      req.query.destination,
      req.query.vehicleType
    );

    return res.status(200).json({
      fare,
    });
  } catch (error) {
    console.error('GET FARE ERROR:', error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// ACCEPT RIDE
// ======================================================
module.exports.acceptRide = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { rideId } = req.body;

    // IMPORTANT:
    // authCaptain stores captain in req.captain
    if (!req.captain?._id) {
      return res.status(401).json({
        message: 'Captain authentication missing',
      });
    }

    if (!rideId) {
      return res.status(400).json({
        message: 'Ride ID is required',
      });
    }

    const ride = await rideModel
      .findByIdAndUpdate(
        rideId,
        {
          captain: req.captain._id,
          status: 'accepted',
        },
        {
          new: true,
        }
      )
      .select('+otp')
      .populate('user')
      .populate('captain');

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found',
      });
    }

    return res.status(200).json({
      success: true,
      ride,
      otp: ride.otp,
    });
  } catch (error) {
    console.error('ACCEPT RIDE ERROR:', error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// VERIFY OTP
// ======================================================
module.exports.verifyOtp = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { rideId, otp } = req.body;

    if (!req.captain?._id) {
      return res.status(401).json({
        message: 'Captain authentication missing',
      });
    }

    const ride = await rideModel
      .findById(rideId)
      .select('+otp')
      .populate('user')
      .populate('captain');

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found',
      });
    }

    if (!ride.captain) {
      return res.status(400).json({
        message: 'Captain is not assigned to this ride',
      });
    }

    // Verify captain
    if (ride.captain._id.toString() !== req.captain._id.toString()) {
      return res.status(403).json({
        message: 'You are not authorized for this ride',
      });
    }

    if (ride.status !== 'accepted') {
      return res.status(400).json({
        message: `Ride cannot start. Current status: ${ride.status}`,
      });
    }

    if (ride.otp !== otp) {
      return res.status(400).json({
        message: 'Invalid OTP',
      });
    }

    // Start ride
    ride.status = 'ongoing';

    await ride.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Ride started.',
      ride,
    });
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// COMPLETE RIDE
// ======================================================
module.exports.completeRide = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { rideId } = req.body;

    // IMPORTANT
    // authCaptain => req.captain
    if (!req.captain?._id) {
      return res.status(401).json({
        message: 'Captain authentication missing',
      });
    }

    if (!rideId) {
      return res.status(400).json({
        message: 'Ride ID is required',
      });
    }

    const ride = await rideModel
      .findById(rideId)
      .populate('user')
      .populate('captain');

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found',
      });
    }

    // Captain missing
    if (!ride.captain) {
      return res.status(400).json({
        message: 'No captain assigned to this ride',
      });
    }

    // Verify captain
    if (ride.captain._id.toString() !== req.captain._id.toString()) {
      return res.status(403).json({
        message: 'You are not authorized to complete this ride',
      });
    }

    // Ride must be ongoing
    if (ride.status !== 'ongoing') {
      return res.status(400).json({
        message: `Ride cannot be completed. Current status: ${ride.status}`,
      });
    }

    // COMPLETE
    ride.status = 'completed';

    await ride.save();

    return res.status(200).json({
      success: true,
      message: 'Ride completed successfully',
      ride,
    });
  } catch (error) {
    console.error('COMPLETE RIDE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// GET USER RIDES
// ======================================================
module.exports.getUserRides = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.user?._id) {
      return res.status(401).json({
        message: 'User authentication missing',
      });
    }

    // Security:
    // User can only request their own rides
    if (req.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        message: 'You are not authorized to view these rides',
      });
    }

    const rides = await rideModel
      .find({
        user: userId,
      })
      .sort({
        createdAt: -1,
      })
      .populate('user')
      .populate('captain');

    rides.forEach((ride, index) => {});

    return res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error('GET USER RIDES ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// CANCEL RIDE
// A user can cancel their own ride while it is still
// 'pending' or 'accepted' (not once it's ongoing/completed).
// If a captain was already assigned, they're notified over
// the socket so their UI can drop the ride immediately.
// ======================================================
module.exports.cancelRide = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { rideId } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({
        message: 'User authentication missing',
      });
    }

    const ride = await rideModel
      .findById(rideId)
      .populate('user')
      .populate('captain');

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found',
      });
    }

    // Security: user can only cancel their own ride
    if (ride.user?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You are not authorized to cancel this ride',
      });
    }

    if (['ongoing', 'completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({
        message: `Ride cannot be cancelled. Current status: ${ride.status}`,
      });
    }

    ride.status = 'cancelled';
    await ride.save();

    // Let the assigned captain (if any) know in real time.
    if (ride.captain?.socketId) {
      sendMessageToSocketid(ride.captain.socketId, 'ride-cancelled', {
        ride,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ride cancelled',
      ride,
    });
  } catch (error) {
    console.error('CANCEL RIDE ERROR:', error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
