const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');

// ==========================================
// VERIFY CAPTAIN
// ==========================================
module.exports.verifyCaptain = async (req, res) => {
  try {
    const { captainId } = req.params;

    const captain = await captainModel.findById(captainId);

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: 'Captain not found',
      });
    }

    // Already verified
    if (captain.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Captain is already verified',
      });
    }

    captain.isVerified = true;

    await captain.save();

    return res.status(200).json({
      success: true,
      message: 'Captain verified successfully',
      captain: {
        id: captain._id,
        email: captain.email,
        isVerified: captain.isVerified,
      },
    });
  } catch (error) {
    console.error('Verify Captain Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to verify captain',
    });
  }
};

// ==========================================
// BLOCK CAPTAIN
// ==========================================
module.exports.blockCaptain = async (req, res) => {
  try {
    const { captainId } = req.params;

    const captain = await captainModel.findById(captainId);

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: 'Captain not found',
      });
    }

    // Already blocked
    if (captain.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Captain is already blocked',
      });
    }

    captain.status = 'inactive';

    // Remove socket connection reference
    captain.socketId = undefined;

    await captain.save();

    return res.status(200).json({
      success: true,
      message: 'Captain blocked successfully',
      captain: {
        id: captain._id,
        email: captain.email,
        status: captain.status,
      },
    });
  } catch (error) {
    console.error('Block Captain Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to block captain',
    });
  }
};

// ==========================================
// UNBLOCK CAPTAIN
// ==========================================
module.exports.unblockCaptain = async (req, res) => {
  try {
    const { captainId } = req.params;

    const captain = await captainModel.findById(captainId);

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: 'Captain not found',
      });
    }

    // Already active
    if (captain.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Captain is already active',
      });
    }

    captain.status = 'active';

    await captain.save();

    return res.status(200).json({
      success: true,
      message: 'Captain unblocked successfully',
      captain: {
        id: captain._id,
        email: captain.email,
        status: captain.status,
      },
    });
  } catch (error) {
    console.error('Unblock Captain Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to unblock captain',
    });
  }
};

// ==========================================
// GET ALL CAPTAINS
// ==========================================
module.exports.getAllCaptains = async (req, res) => {
  try {
    const captains = await captainModel
      .find({})
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: captains.length,
      captains,
    });
  } catch (error) {
    console.error('Get All Captains Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get captains',
    });
  }
};

// ==========================================
// GET ONE CAPTAIN DETAILS
// ==========================================
module.exports.getCaptainDetails = async (req, res) => {
  try {
    const { captainId } = req.params;

    const captain = await captainModel.findById(captainId).select('-password');

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: 'Captain not found',
      });
    }

    return res.status(200).json({
      success: true,
      captain,
    });
  } catch (error) {
    console.error('Get Captain Details Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get captain details',
    });
  }
};

// ==========================================
// ADMIN LOGOUT
// ==========================================
module.exports.logoutAdmin = async (req, res) => {
  try {
    res.clearCookie('adminToken', {
      httpOnly: true,

      secure: process.env.NODE_ENV === 'production',

      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Admin logged out successfully',
    });
  } catch (error) {
    console.error('Admin Logout Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Admin logout failed',
    });
  }
};

// ==========================================
// ADMIN LOGIN
// ==========================================
module.exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ==========================================
    // VALIDATE INPUT
    // ==========================================
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // ==========================================
    // FIND ADMIN
    // password has select:false, so explicitly select it
    // ==========================================
    const admin = await adminModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ==========================================
    // COMPARE PASSWORD
    // ==========================================
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ==========================================
    // GENERATE ADMIN JWT
    // ==========================================
    const token = admin.generateAuthToken();

    // ==========================================
    // SET ADMIN COOKIE
    // ==========================================
    res.cookie('adminToken', token, {
      httpOnly: true,

      // HTTPS in production, HTTP on localhost
      secure: process.env.NODE_ENV === 'production',

      // Localhost: lax
      // Production frontend/backend on different sites: none
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',

      maxAge: 2 * 60 * 60 * 1000, // 2 hours
    });

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================
    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin Login Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Admin login failed',
    });
  }
};
