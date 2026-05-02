const Task = require('../models/Task');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  let taskQuery = {};
  let projectCount = 0;

  if (req.user.role === 'admin') {
    projectCount = await Project.countDocuments();
  } else {
    const memberProjectIds = await Project.find({ members: req.user._id }).distinct('_id');
    taskQuery = { assignedTo: req.user._id };
    projectCount = memberProjectIds.length;
  }

  const [totalTasks, completedTasks, pendingTasks, inProgressTasks, overdueTasks] = await Promise.all([
    Task.countDocuments(taskQuery),
    Task.countDocuments({ ...taskQuery, status: 'completed' }),
    Task.countDocuments({ ...taskQuery, status: 'pending' }),
    Task.countDocuments({ ...taskQuery, status: 'in-progress' }),
    Task.countDocuments({
      ...taskQuery,
      deadline: { $lt: now },
      status: { $ne: 'completed' }
    })
  ]);

  res.json({
    stats: {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects: projectCount
    }
  });
});
