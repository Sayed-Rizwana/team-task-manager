const express = require('express');
const { getUsers } = require('../controllers/userController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, requireAdmin, getUsers);

module.exports = router;
