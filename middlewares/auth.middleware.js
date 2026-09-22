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

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized - No Token',
      });
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token });

    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token Blacklisted',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded._id);

    if (!user) {
      return res.status(401).json({
        error: 'User Not Found',
      });
    }

    req.user = user;

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
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized - No Token',
      });
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token });

    if (isBlacklisted) {
      return res.status(401).json({
        error: 'Token Blacklisted',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const captain = await captainModel.findById(decoded._id);

    if (!captain) {
      return res.status(401).json({
        error: 'Captain Not Found',
      });
    }

    req.captain = captain;

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
    const token =
      req.cookies?.adminToken || req.headers.authorization?.split(' ')[1];

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
      return res.status(401).json({
        success: false,
        message: 'Admin account not found',
      });
    }

    // ==========================================
    // ATTACH ADMIN TO REQUEST
    // ==========================================
    req.admin = admin;

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
