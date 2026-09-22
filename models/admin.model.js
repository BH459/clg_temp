const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// GENERATE ADMIN JWT
// ==========================================
adminSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: 'admin',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '2h',
    }
  );
};

// ==========================================
// COMPARE PASSWORD
// ==========================================
adminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// ==========================================
// HASH PASSWORD
// ==========================================
adminSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};

const adminModel = mongoose.model('Admin', adminSchema);

module.exports = adminModel;
