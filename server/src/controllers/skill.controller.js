const Skill = require('../models/Skill');

const getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find({ projectId: req.project._id }).lean();
    res.json({ status: 'success', data: { skills } });
  } catch (error) { next(error); }
};

const updateSkills = async (req, res, next) => {
  try {
    const { category, skills } = req.body;
    const result = await Skill.findOneAndUpdate(
      { projectId: req.project._id, category },
      { projectId: req.project._id, userId: req.user._id, category, skills },
      { upsert: true, new: true }
    );
    res.json({ status: 'success', data: { skill: result } });
  } catch (error) { next(error); }
};

module.exports = { getSkills, updateSkills };
