function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

exports.badRequest = (message) => createError(400, message);
exports.unauthorized = (message) => createError(401, message);
exports.forbidden = (message) => createError(403, message);
exports.notFound = (message) => createError(404, message);
