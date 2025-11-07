const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  getClassroomController,
  getClassroomByIdController,
  addClassroomController,
  updateClassroomController,
  deleteClassroomController,
} = require("../controllers/classroom.controller");

router.get("/", auth, getClassroomController);
router.get("/:id", auth, getClassroomByIdController);
router.post("/", auth, addClassroomController);
router.patch("/:id", auth, updateClassroomController);
router.delete("/:id", auth, deleteClassroomController);

module.exports = router;

