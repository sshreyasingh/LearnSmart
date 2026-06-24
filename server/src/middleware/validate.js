const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      status: 'error',
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors,
    });
  }

  req.body = result.data.body || req.body;
  req.query = result.data.query || req.query;
  req.params = result.data.params || req.params;

  next();
};

module.exports = validate;
