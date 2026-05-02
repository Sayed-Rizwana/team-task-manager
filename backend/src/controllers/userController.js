const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}, 'name email role').sort({ name: 1 });
  res.json({ users });
});
