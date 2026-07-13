const { v4: uuidv4 } = require('uuid');

module.exports = function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
};
