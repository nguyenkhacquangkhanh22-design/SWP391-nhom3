const authenticate = require("./authenticate");

/**
 * Middleware verifyToken cho các Protected APIs của Renter
 * Xác thực Bearer JWT token từ header Authorization
 */
const verifyToken = authenticate;

module.exports = verifyToken;