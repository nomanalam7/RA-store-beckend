const Subscriber = require("../models/subscriber");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { buildAggregatePagination } = require("../utils/helper");
const { subscribeSchema } = require("../validators/contactValidator");

// Public: newsletter signup (idempotent — repeat emails are accepted quietly)
const subscribe = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, subscribeSchema);
    if (error) return sendError(res, error, 400);

    await Subscriber.updateOne(
      { email: value.email },
      { $setOnInsert: { email: value.email } },
      { upsert: true }
    );
    return sendSuccess(res, {}, "Subscribed successfully", 201);
  } catch (err) {
    console.error("Subscribe error:", err);
    return sendError(res, "Failed to subscribe", 500);
  }
};

// Admin: list subscribers
const listSubscribers = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const [subscribers, totalCount] = await Promise.all([
      Subscriber.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Subscriber.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        subscribers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Subscribers fetched"
    );
  } catch (err) {
    console.error("List subscribers error:", err);
    return sendError(res, "Failed to fetch subscribers", 500);
  }
};

module.exports = { subscribe, listSubscribers };
