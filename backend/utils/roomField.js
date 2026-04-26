const Classroom = require("../models/classroom.model");

const CANDIDATES = ["roomNumber", "room_no", "roomNo", "room", "number", "roomNum"];

/**
 * Inspects the Classroom schema and returns the real field used for room number
 * @returns {string} The field name used for room number
 */
function getRoomFieldName() {
  const paths = Classroom.schema?.paths || {};
  for (const key of CANDIDATES) {
    if (paths[key]) {
      return key;
    }
  }
  // fallback to roomNumber
  return "roomNumber";
}

module.exports = { getRoomFieldName };


