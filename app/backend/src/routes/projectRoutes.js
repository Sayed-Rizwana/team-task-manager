const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  addMember,
  removeMember
} = require('../controllers/projectController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getProjects);
router.get('/:id', protect, getProjectById);
router.post('/', protect, requireAdmin, createProject);
router.post('/:id/add-member', protect, requireAdmin, addMember);
router.post('/:id/remove-member', protect, requireAdmin, removeMember);

module.exports = router;
