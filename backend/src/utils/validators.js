const mongoose = require('mongoose');

exports.isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
