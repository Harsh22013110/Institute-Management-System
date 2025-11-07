const express = require("express");
const router = express.Router();
const { logoutController } = require("../controllers/auth.controller");

router.post("/logout", logoutController);

module.exports = router;

