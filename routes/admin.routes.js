const express = require('express');

const router = express.Router();

const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ==========================================
// ALL ADMIN ROUTES REQUIRE ADMIN AUTH
// ==========================================

router.post('/login', adminController.loginAdmin);

router.get(
  '/captains',
  authMiddleware.authAdmin,
  adminController.getAllCaptains
);

router.get(
  '/captains/:captainId',
  authMiddleware.authAdmin,
  adminController.getCaptainDetails
);

router.patch(
  '/captains/:captainId/verify',
  authMiddleware.authAdmin,
  adminController.verifyCaptain
);

router.patch(
  '/captains/:captainId/block',
  authMiddleware.authAdmin,
  adminController.blockCaptain
);

router.patch(
  '/captains/:captainId/unblock',
  authMiddleware.authAdmin,
  adminController.unblockCaptain
);

router.post('/logout', authMiddleware.authAdmin, adminController.logoutAdmin);

module.exports = router;
