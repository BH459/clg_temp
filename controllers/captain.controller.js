const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blacklistTokenModel = require('../models/blacklistToken.model');
const { validationResult } = require('express-validator');

module.exports.registerCaptain = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  const { fullname, email, password, vehicle } = req.body;

  try {
    const isCaptainAlreadyExist = await captainModel.findOne({ email });

    if (isCaptainAlreadyExist) {
      return res.status(400).json({
        message: 'Captain with this email already exists',
      });
    }

    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
      firstname: fullname.firstname,
      lastname: fullname.lastname,
      email,
      password: hashedPassword,
      color: vehicle.color,
      plate: vehicle.plate,
      capacity: vehicle.capacity,
      vehicleType: vehicle.vehicleType,
    });

    const token = captain.generateAuthToken();

    res.status(201).json({
      token,
      captain,
    });
  } catch (error) {
    console.error('REGISTER CAPTAIN ERROR:', error.message);

    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports.loginCaptain = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const captain = await captainModel
      .findOne({
        email: email.toLowerCase().trim(),
      })
      .select('+password');

    // ==========================================
    // CAPTAIN NOT FOUND
    // ==========================================
    if (!captain) {
      return res.status(401).json({
        message: 'Captain not found',
      });
    }

    // ==========================================
    // PASSWORD CHECK
    // ==========================================
    const isMatch = await captain.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Password incorrect',
      });
    }

    // ==========================================
    // ADMIN APPROVAL CHECK
    // ==========================================
    if (captain.isVerified !== true) {
      return res.status(403).json({
        message: 'Your account is waiting for admin approval',
      });
    }

    // ==========================================
    // ADMIN BLOCK CHECK
    // ==========================================
    if (captain.status === 'inactive') {
      return res.status(403).json({
        message: 'Admin has blocked your account',
      });
    }

    // ==========================================
    // ONLY VERIFIED + ACTIVE CAPTAIN CAN LOGIN
    // ==========================================
    if (captain.isVerified === true && captain.status === 'active') {
      const token = captain.generateAuthToken();

      return res.status(200).json({
        message: 'Captain login successful',
        token,
        captain,
      });
    }

    // ==========================================
    // FALLBACK
    // ==========================================
    return res.status(403).json({
      message: 'Your account is not eligible for login',
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports.getCaptainProfile = async (req, res, next) => {
  res.status(200).json(req.captain);
};

module.exports.logoutCaptain = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (token) {
    await blacklistTokenModel.create({ token });
  }

  res.clearCookie('token');

  res.status(200).json({
    message: 'Logged out successfully',
  });
};

module.exports.updateStats = async (req, res) => {
  try {
    const captain = req.captain;

    captain.totalEarnings =
      Number(captain.totalEarnings || 0) + Number(req.body.fare || 0);

    captain.totalTrips = Number(captain.totalTrips || 0) + 1;

    await captain.save();

    res.status(200).json({
      success: true,
      captain,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
