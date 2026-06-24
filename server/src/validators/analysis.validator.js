const { z } = require('zod');

const analyzeSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
});

module.exports = { analyzeSchema };
