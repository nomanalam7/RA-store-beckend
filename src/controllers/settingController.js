const Setting = require("../models/setting");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const { updateSettingsSchema } = require("../validators/settingValidator");

// The settings document is a singleton keyed by "site"
const getOrCreateSettings = async () => {
  let settings = await Setting.findOne({ key: "site" });
  if (!settings) settings = await Setting.create({ key: "site" });
  return settings;
};

// Flatten nested payload into dot-paths so partial updates never clobber siblings
const flatten = (obj, prefix = "", out = {}) => {
  Object.entries(obj).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  });
  return out;
};

// Public: read site settings / CMS content
const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return sendSuccess(res, { settings }, "Settings fetched");
  } catch (err) {
    console.error("Get settings error:", err);
    return sendError(res, "Failed to fetch settings", 500);
  }
};

// Admin: partial update of any settings section
const updateSettings = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateSettingsSchema);
    if (error) return sendError(res, error, 400);

    await getOrCreateSettings();
    const $set = flatten(value);
    const settings = await Setting.findOneAndUpdate(
      { key: "site" },
      { $set },
      { new: true }
    );
    return sendSuccess(res, { settings }, "Settings updated");
  } catch (err) {
    console.error("Update settings error:", err);
    return sendError(res, "Failed to update settings", 500);
  }
};

module.exports = { getSettings, updateSettings, getOrCreateSettings };
