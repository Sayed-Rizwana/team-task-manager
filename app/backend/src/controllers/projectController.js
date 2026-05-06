const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, forbidden, notFound } = require('../utils/httpErrors');
const { isValidObjectId } = require('../utils/validators');

async function resolveMember({ userId, email }) {
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw badRequest('Invalid userId');
    }
    return User.findById(userId);
  }

  if (email) {
    return User.findOne({ email: email.toLowerCase().trim() });
  }

  throw badRequest('userId or email is required');
}

async function ensureProjectAccess(projectId, currentUser, adminOnly = false) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw notFound('Project not found');
  }

  const isMember = project.members.some((memberId) => memberId.toString() === currentUser._id.toString());
  const isCreator = project.createdBy.toString() === currentUser._id.toString();
  const isAdmin = currentUser.role === 'admin';

  if (adminOnly && !isAdmin) {
    throw forbidden('Admin access required');
  }

  if (!adminOnly && !isAdmin && !isMember) {
    throw forbidden('Access denied');
  }

  return { project, isCreator, isAdmin };
}

exports.createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw badRequest('Project name is required');
  }

  const project = await Project.create({
    name,
    description,
    createdBy: req.user._id,
    members: [req.user._id]
  });

  const populatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email role')
    .populate('members', 'name email role');

  res.status(201).json({
    message: 'Project created successfully',
    project: populatedProject
  });
});

exports.getProjects = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { members: req.user._id };
  const projects = await Project.find(query)
    .populate('createdBy', 'name email role')
    .populate('members', 'name email role')
    .sort({ createdAt: -1 });

  res.json({ projects });
});

exports.getProjectById = asyncHandler(async (req, res) => {
  const { project } = await ensureProjectAccess(req.params.id, req.user);
  const populatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email role')
    .populate('members', 'name email role');

  const taskQuery = req.user.role === 'admin'
    ? { projectId: project._id }
    : { projectId: project._id, assignedTo: req.user._id };

  const tasks = await Task.find(taskQuery)
    .populate('projectId', 'name')
    .populate('assignedTo', 'name email role')
    .sort({ deadline: 1, createdAt: -1 });

  res.json({ project: populatedProject, tasks });
});

exports.addMember = asyncHandler(async (req, res) => {
  const { project } = await ensureProjectAccess(req.params.id, req.user, true);
  const member = await resolveMember(req.body);

  if (!member) {
    throw notFound('User not found');
  }

  if (project.members.some((memberId) => memberId.toString() === member._id.toString())) {
    throw badRequest('User is already a member of this project');
  }

  project.members.push(member._id);
  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email role')
    .populate('members', 'name email role');

  res.json({
    message: 'Member added successfully',
    project: populatedProject
  });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const { project } = await ensureProjectAccess(req.params.id, req.user, true);
  const member = await resolveMember(req.body);

  if (!member) {
    throw notFound('User not found');
  }

  if (project.createdBy.toString() === member._id.toString()) {
    throw badRequest('Project creator cannot be removed');
  }

  project.members = project.members.filter(
    (memberId) => memberId.toString() !== member._id.toString()
  );
  await project.save();

  await Task.updateMany(
    { projectId: project._id, assignedTo: member._id },
    { $set: { assignedTo: null, status: 'pending' } }
  );

  const populatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email role')
    .populate('members', 'name email role');

  res.json({
    message: 'Member removed successfully',
    project: populatedProject
  });
});
