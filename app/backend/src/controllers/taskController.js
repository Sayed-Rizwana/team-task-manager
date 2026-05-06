const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, forbidden, notFound } = require('../utils/httpErrors');
const { isValidObjectId } = require('../utils/validators');

async function findProject(projectId) {
  if (!isValidObjectId(projectId)) {
    throw badRequest('Invalid projectId');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw notFound('Project not found');
  }

  return project;
}

async function validateAssignee(project, assignedTo) {
  if (!assignedTo) {
    return null;
  }

  if (!isValidObjectId(assignedTo)) {
    throw badRequest('Invalid assignedTo user');
  }

  const user = await User.findById(assignedTo);
  if (!user) {
    throw notFound('Assignee not found');
  }

  const isMember = project.members.some((memberId) => memberId.toString() === user._id.toString());
  if (!isMember) {
    throw badRequest('Assignee must be a project member');
  }

  return user;
}

function isProjectMember(project, userId) {
  return project.members.some((memberId) => memberId.toString() === userId.toString());
}

exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, projectId, assignedTo, deadline, status } = req.body;

  if (req.user.role !== 'admin') {
    throw forbidden('Only admins can create tasks');
  }

  if (!title || !projectId) {
    throw badRequest('Title and projectId are required');
  }

  const project = await findProject(projectId);

  await validateAssignee(project, assignedTo);

  const task = await Task.create({
    title,
    description,
    projectId,
    assignedTo: assignedTo || null,
    deadline: deadline || null,
    status: status || 'pending'
  });

  const populatedTask = await Task.findById(task._id)
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email role');

  res.status(201).json({
    message: 'Task created successfully',
    task: populatedTask
  });
});

exports.getTasks = asyncHandler(async (req, res) => {
  const { projectId, status, assignedTo } = req.query;
  const query = {};

  if (projectId) {
    query.projectId = projectId;
  }

  if (status) {
    query.status = status;
  }

  if (req.user.role === 'admin') {
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
  } else {
    query.assignedTo = req.user._id;
  }

  const tasks = await Task.find(query)
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email role')
    .sort({ deadline: 1, createdAt: -1 });

  res.json({ tasks });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    throw notFound('Task not found');
  }

  const project = await Project.findById(task.projectId);
  const isAdmin = req.user.role === 'admin';
  const isAssignedUser = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

  if (!isAdmin && !isAssignedUser) {
    throw forbidden('Access denied');
  }

  if (!isAdmin) {
    const allowedKeys = ['status'];
    const attemptedKeys = Object.keys(req.body);
    const hasInvalidMemberUpdate = attemptedKeys.some((key) => !allowedKeys.includes(key));

    if (hasInvalidMemberUpdate) {
      throw forbidden('Members can only update task status');
    }
  }

  if (req.body.projectId) {
    throw badRequest('projectId cannot be changed');
  }

  if (req.body.assignedTo !== undefined) {
    await validateAssignee(project, req.body.assignedTo);
    task.assignedTo = req.body.assignedTo || null;
  }

  if (req.body.title !== undefined) {
    task.title = req.body.title;
  }

  if (req.body.description !== undefined) {
    task.description = req.body.description;
  }

  if (req.body.status !== undefined) {
    task.status = req.body.status;
  }

  if (req.body.deadline !== undefined) {
    task.deadline = req.body.deadline || null;
  }

  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email role');

  res.json({
    message: 'Task updated successfully',
    task: updatedTask
  });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw forbidden('Only admins can delete tasks');
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    throw notFound('Task not found');
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted successfully' });
});
