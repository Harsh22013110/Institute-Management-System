const mongoose = require("mongoose");
const Classroom = require("../models/classroom.model");
const { getRoomFieldName } = require("./roomField");

/**
 * Resolve a room by ObjectId or roomNumber (robust lookup)
 * @param {String|Number} param - Either an ObjectId string or a roomNumber (401-412)
 * @returns {Promise<Object|null>} Classroom document or null if not found
 */
async function resolveRoom(param) {
  try {
    if (!param) return null;

    // 1) valid Mongo _id → fetch by _id
    if (mongoose.Types.ObjectId.isValid(param) && param.toString().length === 24) {
      const doc = await Classroom.findById(param);
      if (doc) {
        // Only log in debug scenarios, not for bulk operations
        // (Note: resolveRoom doesn't have access to req, so we can't check URL here)
        // These logs are generally useful, so keeping them but they're not too noisy
        return doc;
      }
    }

    // 2) otherwise treat as room number, but support string or number in DB
    const field = getRoomFieldName();
    const asNum = Number(param);
    const queries = [];

    if (!Number.isNaN(asNum)) {
      // Try as number
      queries.push({ [field]: asNum });
      // Also try as string representation of number
      queries.push({ [field]: asNum.toString() });
    }
    
    // Also try the raw string, trimmed
    queries.push({ [field]: String(param).trim() });

    // Try case-insensitive if field is string type
    const fieldSchema = Classroom.schema?.paths[field];
    if (fieldSchema && fieldSchema.instance === "String") {
      queries.push({ [field]: { $regex: new RegExp(`^${String(param).trim()}$`, "i") } });
    }

    // Execute query with $or
    const doc = await Classroom.findOne({ $or: queries });
    
    if (doc) {
      // Only log in debug scenarios, not for bulk operations
      // (Note: resolveRoom doesn't have access to req, so we can't check URL here)
      // These logs are generally useful, so keeping them but they're not too noisy
      return doc;
    }

    // Reduced verbosity: only warn in non-bulk scenarios
    // Since we don't have req context here, we'll keep it minimal
    // The middleware will guard the actual error response
    return null;
  } catch (error) {
    console.error("Error resolving room:", error);
    return null;
  }
}

module.exports = resolveRoom;
