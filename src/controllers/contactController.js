const Contact = require("../models/contact");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { buildAggregatePagination } = require("../utils/helper");
const { createContactSchema } = require("../validators/contactValidator");

// Public: submit a contact message
const createContact = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, createContactSchema);
    if (error) return sendError(res, error, 400);

    await Contact.create(value);
    return sendSuccess(res, {}, "Message sent successfully", 201);
  } catch (err) {
    console.error("Create contact error:", err);
    return sendError(res, "Failed to send message", 500);
  }
};

// Admin: list messages (optional ?unread=true)
const listContacts = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const filter = {};
    if (req.query.unread === "true") filter.isRead = false;

    const [messages, totalCount, unreadCount] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(filter),
      Contact.countDocuments({ isRead: false }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        messages,
        unreadCount,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Messages fetched"
    );
  } catch (err) {
    console.error("List contacts error:", err);
    return sendError(res, "Failed to fetch messages", 500);
  }
};

const markContactRead = async (req, res) => {
  try {
    const message = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!message) return sendError(res, "Message not found", 404);
    return sendSuccess(res, { message }, "Message marked as read");
  } catch (err) {
    console.error("Mark contact read error:", err);
    return sendError(res, "Failed to update message", 500);
  }
};

const deleteContact = async (req, res) => {
  try {
    const message = await Contact.findByIdAndDelete(req.params.id);
    if (!message) return sendError(res, "Message not found", 404);
    return sendSuccess(res, {}, "Message deleted");
  } catch (err) {
    console.error("Delete contact error:", err);
    return sendError(res, "Failed to delete message", 500);
  }
};

module.exports = { createContact, listContacts, markContactRead, deleteContact };
