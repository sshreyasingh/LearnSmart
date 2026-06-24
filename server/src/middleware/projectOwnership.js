const Project = require('../models/Project');
const AppError = require('../utils/AppError');

const projectOwnership = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;

    if (!projectId) {
      return next(new AppError('Project ID is required', 400, 'PROJECT_ID_REQUIRED'));
    }

    const project = await Project.findById(projectId).lean();

    if (!project) {
      return next(new AppError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    }

    if (project.userId.toString() !== req.user._id.toString()) {
      return next(new AppError('You do not have access to this project', 403, 'FORBIDDEN'));
    }

    req.project = project;
    next();
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('Invalid project ID', 400, 'INVALID_ID'));
    }
    next(error);
  }
};

module.exports = projectOwnership;
