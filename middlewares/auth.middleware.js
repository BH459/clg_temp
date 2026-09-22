const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const blacklistTokenModel = require('../models/blacklistToken.model');
const jwt = require('jsonwebtoken');

// ===============================
// USER AUTH
// ===============================
module.exports.authUser = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];

    console.log('\n========== AUTH USER ==========');
    console.log('TOKEN EXISTS:', !!token);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized - No Token',
      });
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token });

    if (isBlacklisted) {
      console.log('USER TOKEN BLACKLISTED');

      return res.status(401).json({
        error: 'Token Blacklisted',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log('USER DECODED:', decoded);

    const user = await userModel.findById(decoded._id);

    if (!user) {
      return res.status(401).json({
        error: 'User Not Found',
      });
    }

    req.user = user;

    console.log('USER AUTH SUCCESS:', user._id);

    next();
  } catch (error) {
    console.error('AUTH USER ERROR:', error.message);

    return res.status(401).json({
      error: error.message,
    });
  }
};

// ===============================
// CAPTAIN AUTH
// ===============================
module.exports.authCaptain = async (req, res, next) => {
  try {
    console.log('\n========== AUTH CAPTAIN ==========');

    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];

    console.log('TOKEN EXISTS:', !!token);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized - No Token',
      });
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token });

    console.log('BLACKLISTED:', !!isBlacklisted);

    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token Blacklisted',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log('CAPTAIN DECODED:', decoded);

    const captain = await captainModel.findById(decoded._id);

    if (!captain) {
      console.log('CAPTAIN NOT FOUND');

      return res.status(401).json({
        error: 'Captain Not Found',
      });
    }

    req.captain = captain;

    console.log('CAPTAIN AUTH SUCCESS:', captain._id);

    next();
  } catch (error) {
    console.error('AUTH CAPTAIN ERROR:', error.message);

    return res.status(401).json({
      error: error.message,
    });
  }
};

// ===============================
// ADMIN AUTH
// ===============================
module.exports.authAdmin = async (req, res, next) => {
  try {
    console.log('\n========== AUTH ADMIN ==========');

    const token =
      req.cookies?.adminToken || req.headers.authorization?.split(' ')[1];

    console.log('ADMIN TOKEN EXISTS:', !!token);

    // ==========================================
    // NO TOKEN
    // ==========================================
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
      });
    }

    // ==========================================
    // CHECK BLACKLIST
    // ==========================================
    const isBlacklisted = await blacklistTokenModel.findOne({ token });

    console.log('ADMIN TOKEN BLACKLISTED:', !!isBlacklisted);

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Admin token has been revoked',
      });
    }

    // ==========================================
    // VERIFY JWT
    // ==========================================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log('ADMIN DECODED:', decoded);

    // ==========================================
    // CHECK ADMIN ROLE
    // ==========================================
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    // ==========================================
    // CHECK ADMIN IN DATABASE
    // ==========================================
    const admin = await adminModel.findById(decoded.id);

    if (!admin) {
      console.log('ADMIN NOT FOUND');

      return res.status(401).json({
        success: false,
        message: 'Admin account not found',
      });
    }

    // ==========================================
    // ATTACH ADMIN TO REQUEST
    // ==========================================
    req.admin = admin;

    console.log('ADMIN AUTH SUCCESS:', admin._id);

    next();
  } catch (error) {
    console.error('AUTH ADMIN ERROR:', error.message);

    // ==========================================
    // JWT ERROR
    // ==========================================
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired admin token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Admin authentication failed',
    });
  }
};
