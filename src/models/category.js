const mongoose = require("mongoose");
const { slugify } = require("../utils/helper");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Fallback slug (controllers set a guaranteed-unique slug; this protects direct saves)
categorySchema.pre("validate", function ensureSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

module.exports = mongoose.model("Category", categorySchema);
