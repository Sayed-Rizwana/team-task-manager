const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { unauthorized, forbidden } = require('../utils/httpErrors');

exports.protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw unauthorized('Authentication required');
  }

  if (!process.env.JWT_SECRET) {
    throw unauthorized('JWT_SECRET is not configured');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw unauthorized('User not found');
  }

  req.user = user;
  next();
});

exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(forbidden('Admin access required'));
  }

  next();
};
