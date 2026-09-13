// Migrates products with the legacy String[] `sizes` field to the new
// object-based format [{ size: String, stock: Number }].
//
// Legacy products store a single global `stock` with no per-size breakdown,
// so the migration distributes that global stock across the sizes:
//   - stock is split evenly across all sizes
//   - any remainder is added to the FIRST size (so total is preserved)
// The global `stock` field is kept in sync with the new sum for backward
// compatibility.
//
// Usage:
//   npm run migrate:sizestock                 # real run
//   npm run migrate:sizestock -- --dry-run    # preview, no writes
//   npm run migrate:sizestock -- --stock 5    # set each size to 5 instead of splitting
//
// Safe to re-run: products already in object format are skipped.
// Will not run on a fresh DB with no products.
process.env.TZ = "Asia/Riyadh";
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../core/database");
const Product = require("../models/product");

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    fixedStock: (() => {
      const i = args.indexOf("--stock");
      if (i === -1) return null;
      const n = parseInt(args[i + 1], 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    })(),
  };
};

const isObjectFormat = (sizes) =>
  Array.isArray(sizes) && sizes.length > 0 && typeof sizes[0] === "object";

// Distribute a global stock total across size strings.
const distributeStock = (sizeNames, total, fixedStock) => {
  if (fixedStock != null) {
    return sizeNames.map((size) => ({ size, stock: fixedStock }));
  }
  if (sizeNames.length === 0) return [];
  const base = Math.floor(total / sizeNames.length);
  const remainder = total % sizeNames.length;
  return sizeNames.map((size, i) => ({
    size,
    stock: i === 0 ? base + remainder : base,
  }));
};

const run = async () => {
  await connectDB();

  const { dryRun, fixedStock } = parseArgs();

  // Find legacy products: sizes is a non-empty array of STRINGS
  const legacyProducts = await Product.find({
    $expr: {
      $and: [
        { $gt: [{ $size: "$sizes" }, 0] },
        { $eq: [{ $type: { $arrayElemAt: ["$sizes", 0] } }, "string"] },
      ],
    },
  }).select("name stock sizes _id");

  if (legacyProducts.length === 0) {
    console.log("✔ No legacy-size products found — nothing to migrate.");
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log(
    `${dryRun ? "🔍 DRY RUN — " : ""}Found ${legacyProducts.length} product(s) with legacy string sizes.\n`
  );

  let updated = 0;
  let alreadyNew = 0;

  for (const product of legacyProducts) {
    // Safety: skip if somehow already migrated inside this loop
    if (isObjectFormat(product.sizes)) {
      alreadyNew++;
      continue;
    }

    const sizeNames = product.sizes.map((s) => String(s).trim()).filter(Boolean);
    if (sizeNames.length === 0) {
      console.log(`  ⏭  #${product._id} "${product.name}" — empty sizes string[], clearing`);
      if (!dryRun) {
        await Product.updateOne({ _id: product._id }, { $set: { sizes: [] } });
      }
      continue;
    }

    const globalStock = Number(product.stock) || 0;
    const sizeStock = distributeStock(sizeNames, globalStock, fixedStock);
    const newGlobal = sizeStock.reduce((sum, s) => sum + s.stock, 0);

    console.log(
      `  ${dryRun ? "[dry]" : "[run]"} "${product.name}"` +
        ` — ${globalStock} stock → ` +
        `${sizeStock.map((s) => `${s.size}:${s.stock}`).join(", ")}` +
        ` (total ${newGlobal})`
    );

    if (!dryRun) {
      await Product.updateOne(
        { _id: product._id },
        { $set: { sizes: sizeStock, stock: newGlobal } }
      );
    }
    updated++;
  }

  console.log(`\n${dryRun ? "No changes written (dry run)." : `✔ Migrated ${updated} product(s).`}`);
  if (alreadyNew) console.log(`  (${alreadyNew} product(s) were already in new format.)`);

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});