const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/ApiResponse");
const adminDetails = require("../models/details/admin-details.model");

/**
 * Middleware to check if user is admin
 * Must be used after auth middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return ApiResponse.unauthorized("Authentication required").send(res);
    }

    // Check if user is an admin
    const admin = await adminDetails.findById(req.userId);
    if (!admin) {
      return ApiResponse.forbidden("Admin access required").send(res);
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return ApiResponse.forbidden("Admin access required").send(res);
  }
};

module.exports = requireAdmin;


