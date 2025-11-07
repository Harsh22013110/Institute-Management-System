const ApiResponse = require("../utils/ApiResponse");

/**
 * POST /api/auth/logout
 * Logout endpoint to clear authentication cookie
 */
const logoutController = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return ApiResponse.success(null, "Logged out successfully").send(res);
  } catch (error) {
    console.error("Logout error:", error);
    return ApiResponse.internalServerError(error.message).send(res);
  }
};

module.exports = { logoutController };

