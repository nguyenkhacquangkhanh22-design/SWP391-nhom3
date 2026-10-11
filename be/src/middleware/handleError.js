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

  if (statusCode >= 500) {
    console.error("Request failed:", error);
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
