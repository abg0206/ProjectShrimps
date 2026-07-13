const logger = require('../logger');

// Must be registered LAST, after all routes, in your app entry file:
//   app.use(errorHandler);
module.exports = function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path,
    method: req.method
  });

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    requestId: req.id
  });
};
