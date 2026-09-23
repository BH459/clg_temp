const express = require('express');

const router = express.Router();

const { body, query } = require('express-validator');

const authMiddleware = require('../middlewares/auth.middleware');

const rideController = require('../controllers/ride.controller');

// ======================================================
// USER RIDE HISTORY
// ======================================================
router.get(
  '/user/:userId',

  authMiddleware.authUser,

  rideController.getUserRides
);

// ======================================================
// CREATE RIDE
// ======================================================
router.post(
  '/create',

  authMiddleware.authUser,

  body('pickup').isString().isLength({ min: 3 }),

  body('destination').isString().isLength({ min: 3 }),

  body('vehicleType').isString(),

  rideController.createRide
);

// ======================================================
// GET FARE
// ======================================================
router.get(
  '/get-fare',

  authMiddleware.authUser,

  query('pickup').isString().isLength({ min: 3 }),

  query('destination').isString().isLength({ min: 3 }),

  query('vehicleType').optional().isString(),

  rideController.getFare
);

// ======================================================
// ACCEPT RIDE
// ======================================================
router.post(
  '/accept',

  authMiddleware.authCaptain,

  body('rideId').isString(),

  rideController.acceptRide
);

// ======================================================
// VERIFY OTP
// ======================================================
router.post(
  '/verify-otp',

  authMiddleware.authCaptain,

  body('rideId').isString(),

  body('otp').isLength({
    min: 6,
    max: 6,
  }),

  rideController.verifyOtp
);

// ======================================================
// COMPLETE RIDE
// ======================================================
router.post(
  '/complete',

  authMiddleware.authCaptain,

  body('rideId').isString(),

  rideController.completeRide
);

// ======================================================
// CANCEL RIDE
// ======================================================
router.post(
  '/cancel',

  authMiddleware.authUser,

  body('rideId').isString(),

  rideController.cancelRide
);

module.exports = router;
