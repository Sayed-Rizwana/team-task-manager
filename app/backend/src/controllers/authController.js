const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, unauthorized } = require('../utils/httpErrors');

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw badRequest('Name, email, and password are required');
  }

  if (!['admin', 'member'].includes(role || 'member')) {
    throw badRequest('Role must be admin or member');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw badRequest('Email already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'member'
  });

  res.status(201).json({
    message: 'User created successfully',
    token: createToken(user),
    user: user.toPublicJSON()
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw badRequest('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw unauthorized('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw unauthorized('Invalid credentials');
  }

  res.json({
    message: 'Login successful',
    token: createToken(user),
    user: user.toPublicJSON()
  });
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});
