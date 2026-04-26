const Classroom = require("../models/classroom.model");
const ApiResponse = require("../utils/ApiResponse");

const getClassroomController = async (req, res, next) => {
  try {
    const { search = "", includeOccupancy = "true" } = req.query;

    const classrooms = await Classroom.find({
      $or: [
        { roomNumber: { $regex: search, $options: "i" } },
      ],
    }).sort({ roomNumber: 1 });

    if (!classrooms || classrooms.length === 0) {
      return ApiResponse.error("No Classrooms Found", 404).send(res);
    }

    // If includeOccupancy is true, compute occupancy status
    if (includeOccupancy === "true") {
      const { computeMultipleRoomOccupancy } = require("../utils/occupancy");
      const now = new Date();
      const roomNumbers = classrooms.map((r) => parseInt(r.roomNumber, 10));
      const occupancyMap = await computeMultipleRoomOccupancy(roomNumbers, now);

      const classroomsWithOccupancy = classrooms.map((room) => {
        const roomNum = parseInt(room.roomNumber, 10);
        const occupancy = occupancyMap.get(roomNum) || {
          status: "Available",
          occupiedUntil: null,
        };
        return {
          ...room.toObject(),
          occupancyStatus: occupancy.status,
          occupiedUntil: occupancy.occupiedUntil
            ? occupancy.occupiedUntil.toISOString()
            : null,
        };
      });

      return ApiResponse.success(
        classroomsWithOccupancy,
        "All Classrooms Loaded with Occupancy!"
      ).send(res);
    }

    return ApiResponse.success(classrooms, "All Classrooms Loaded!").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const addClassroomController = async (req, res, next) => {
  let { roomNumber, capacity, floor, status } = req.body;
  try {
    let existingClassroom = await Classroom.findOne({ roomNumber });

    if (existingClassroom) {
      return ApiResponse.error(
        "Classroom with this room number already exists!",
        409
      ).send(res);
    }

    const newClassroom = await Classroom.create(req.body);
    return ApiResponse.created(newClassroom, "Classroom Added Successfully!").send(
      res
    );
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const updateClassroomController = async (req, res, next) => {
  try {
    const { roomNumber, capacity, floor, status } = req.body;

    if (roomNumber) {
      const existingClassroom = await Classroom.findOne({
        _id: { $ne: req.params.id },
        roomNumber: roomNumber,
      });

      if (existingClassroom) {
        return ApiResponse.error(
          "Classroom with this room number already exists!",
          409
        ).send(res);
      }
    }

    let classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!classroom) {
      return ApiResponse.error("Classroom Not Found!", 404).send(res);
    }

    return ApiResponse.success(classroom, "Classroom Updated Successfully!").send(
      res
    );
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const getClassroomByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findById(id);
    
    if (!classroom) {
      return ApiResponse.error("Classroom Not Found!", 404).send(res);
    }

    return ApiResponse.success(classroom, "Classroom loaded successfully").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const deleteClassroomController = async (req, res, next) => {
  try {
    let classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return ApiResponse.error("Classroom Not Found!", 404).send(res);
    }

    await Classroom.findByIdAndDelete(req.params.id);
    return ApiResponse.success(null, "Classroom Deleted Successfully!").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

module.exports = {
  getClassroomController,
  getClassroomByIdController,
  addClassroomController,
  updateClassroomController,
  deleteClassroomController,
};

