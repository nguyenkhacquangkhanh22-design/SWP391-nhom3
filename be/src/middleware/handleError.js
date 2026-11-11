function handleError(error, _req, res, _next) {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must contain valid JSON" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: "Email or account identifier already exists" });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.name === "MulterError") {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Kích thước ảnh tối đa là 10MB."
        : error.message,
    });
  }

  const databaseUnavailable =
    error.name === "MongoServerSelectionError" ||
    error.name === "MongoNetworkError" ||
    error.name === "MongoTimeoutError" ||
    (error.name === "MongooseError" && /buffering timed out/i.test(error.message));
  const statusCode = databaseUnavailable
    ? 503
    : Number.isInteger(error.statusCode)
      && error.statusCode >= 400
      && error.statusCode < 500
      ? error.statusCode
      : 500;

  console.error(`\x1b[31m[BE ERROR ${statusCode}]\x1b[0m ${_req?.method || ""} ${_req?.originalUrl || ""} - ${error.message}`);
  if (statusCode >= 500 && error.stack) {
    console.error(error.stack);
  }

  return res.status(statusCode).json({
    message: databaseUnavailable
      ? "Database service is unavailable"
      : statusCode >= 500
        ? "Internal server error"
        : error.message,
  });
}

module.exports = handleError;
