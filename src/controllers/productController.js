const Product = require("../models/product");
const Category = require("../models/category");
const { sendSuccess, sendError } = require("../utils/responseHelper");
const { schemaValidator } = require("../utils/validator");
const {
  buildAggregatePagination,
  escapeRegex,
  generateUniqueSlug,
} = require("../utils/helper");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validators/productValidator");

const emptyPagination = (page, limit) => ({
  page,
  limit,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
});

// Computed pricing fields added inside aggregation (mirror the model virtuals)
const PRICING_FIELDS = {
  effectivePrice: { $ifNull: ["$salePrice", "$price"] },
  onSale: {
    $and: [{ $ne: ["$salePrice", null] }, { $lt: ["$salePrice", "$price"] }],
  },
  discountPercentage: {
    $cond: [
      { $and: [{ $ne: ["$salePrice", null] }, { $lt: ["$salePrice", "$price"] }] },
      {
        $round: [
          {
            $multiply: [
              { $divide: [{ $subtract: ["$price", "$salePrice"] }, "$price"] },
              100,
            ],
          },
          0,
        ],
      },
      0,
    ],
  },
  inStock: { $gt: ["$stock", 0] },
};

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { effectivePrice: 1 },
  price_desc: { effectivePrice: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  best_selling: { salesCount: -1, createdAt: -1 },
};

// Public: rich product listing with filtering, sorting, pagination
const listProducts = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const {
      category,
      size,
      minPrice,
      maxPrice,
      availability,
      sale,
      search,
      sort = "newest",
    } = req.query;

    const match = { isActive: true };

    if (category) {
      const cat = await Category.findOne({ slug: category }).select("_id");
      if (!cat) {
        return sendSuccess(
          res,
          { products: [], pagination: emptyPagination(page, limit) },
          "Products fetched"
        );
      }
      match.category = cat._id;
    }

    if (size) {
      const sizes = String(size)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (sizes.length) match.sizes = { $in: sizes };
    }

    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), "i");
      match.$or = [
        { name: rx },
        { shortDescription: rx },
        { description: rx },
        { sku: rx },
      ];
    }

    const postMatch = {};
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice !== undefined && minPrice !== "" && !Number.isNaN(min)) {
      postMatch.effectivePrice = { ...(postMatch.effectivePrice || {}), $gte: min };
    }
    if (maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(max)) {
      postMatch.effectivePrice = { ...(postMatch.effectivePrice || {}), $lte: max };
    }
    if (availability === "in-stock") postMatch.inStock = true;
    if (availability === "out-of-stock") postMatch.inStock = false;
    if (sale === "true") postMatch.onSale = true;

    const sortStage = SORT_MAP[sort] || SORT_MAP.newest;

    const pipeline = [{ $match: match }, { $addFields: PRICING_FIELDS }];
    if (Object.keys(postMatch).length) pipeline.push({ $match: postMatch });
    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $sort: sortStage },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [{ $count: "total" }],
        },
      }
    );

    const results = await Product.aggregate(pipeline);
    const { data, pagination } = buildAggregatePagination(req, results);
    return sendSuccess(res, { products: data, pagination }, "Products fetched");
  } catch (err) {
    console.error("List products error:", err);
    return sendError(res, "Failed to fetch products", 500);
  }
};

// Public: single product by slug + related products (same category)
const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("category");
    if (!product) return sendError(res, "Product not found", 404);

    const related = await Product.find({
      category: product.category?._id || product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .populate("category")
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(8);

    return sendSuccess(res, { product, related }, "Product fetched");
  } catch (err) {
    console.error("Get product error:", err);
    return sendError(res, "Failed to fetch product", 500);
  }
};

const getLimit = (req, fallback = 8) =>
  Math.min(Math.max(parseInt(req.query.limit, 10) || fallback, 1), 50);

// Public: latest active products
const getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(getLimit(req));
    return sendSuccess(res, { products }, "New arrivals fetched");
  } catch (err) {
    console.error("New arrivals error:", err);
    return sendError(res, "Failed to fetch new arrivals", 500);
  }
};

// Public: best sellers by units sold
const getTopSelling = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category")
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(getLimit(req));
    return sendSuccess(res, { products }, "Top selling fetched");
  } catch (err) {
    console.error("Top selling error:", err);
    return sendError(res, "Failed to fetch top selling products", 500);
  }
};

// Public: featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(getLimit(req));
    return sendSuccess(res, { products }, "Featured products fetched");
  } catch (err) {
    console.error("Featured products error:", err);
    return sendError(res, "Failed to fetch featured products", 500);
  }
};

// Admin: full product list with search / category / status filters
const adminListProducts = async (req, res) => {
  try {
    const { page, limit, skip } = buildAggregatePagination(req);
    const { search, category, status } = req.query;

    const filter = {};
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (category) filter.category = category;
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [{ name: rx }, { sku: rx }];
    }

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return sendSuccess(
      res,
      {
        products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Products fetched"
    );
  } catch (err) {
    console.error("Admin list products error:", err);
    return sendError(res, "Failed to fetch products", 500);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) return sendError(res, "Product not found", 404);
    return sendSuccess(res, { product }, "Product fetched");
  } catch (err) {
    console.error("Get product by id error:", err);
    return sendError(res, "Failed to fetch product", 500);
  }
};

const createProduct = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, createProductSchema);
    if (error) return sendError(res, error, 400);

    const category = await Category.findById(value.category);
    if (!category) return sendError(res, "Selected category does not exist", 400);

    value.slug = await generateUniqueSlug(Product, value.slug || value.name);
    const created = await Product.create(value);
    const product = await Product.findById(created._id).populate("category");
    return sendSuccess(res, { product }, "Product created", 201);
  } catch (err) {
    console.error("Create product error:", err);
    return sendError(res, "Failed to create product", 500);
  }
};

const updateProduct = async (req, res) => {
  try {
    const [error, value] = schemaValidator(req.body, updateProductSchema);
    if (error) return sendError(res, error, 400);

    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, "Product not found", 404);

    if (value.category) {
      const category = await Category.findById(value.category);
      if (!category) return sendError(res, "Selected category does not exist", 400);
    }

    // Cross-validate price/salePrice even when only one of them is sent
    const nextPrice = value.price ?? product.price;
    const nextSale =
      value.salePrice !== undefined ? value.salePrice : product.salePrice;
    if (nextSale != null && nextSale >= nextPrice) {
      return sendError(res, "salePrice must be lower than price", 400);
    }

    if (value.slug || value.name) {
      value.slug = await generateUniqueSlug(
        Product,
        value.slug || value.name,
        product._id
      );
    }

    Object.assign(product, value);
    await product.save();
    const updated = await Product.findById(product._id).populate("category");
    return sendSuccess(res, { product: updated }, "Product updated");
  } catch (err) {
    console.error("Update product error:", err);
    return sendError(res, "Failed to update product", 500);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return sendError(res, "Product not found", 404);
    return sendSuccess(res, {}, "Product deleted");
  } catch (err) {
    console.error("Delete product error:", err);
    return sendError(res, "Failed to delete product", 500);
  }
};

module.exports = {
  listProducts,
  getProductBySlug,
  getNewArrivals,
  getTopSelling,
  getFeaturedProducts,
  adminListProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
