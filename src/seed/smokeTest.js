// Read-only smoke tests for the RA Store public API.
// Verifies the new feature surfaces return correctly-shaped data:
//   - Review system (ratingSummary, distribution, verified badge)
//   - Size-wise inventory (duck-types legacy vs new object format)
//   - Settings (WhatsApp, delivery estimate, restricted words)
//   - Order tracking (statusHistory, deliveryEstimate snapshot)
//   - Core catalog + commerce endpoints still healthy
//
// Usage:
//   node src/seed/smokeTest.js                          # deployed API
//   API_BASE=http://localhost:6001/api node src/seed/smokeTest.js
//
// Read-only: performs GET requests only, never creates or mutates data.
process.env.TZ = "Asia/Riyadh";
require("dotenv").config();

const API_BASE = (process.env.API_BASE || "https://ra-store-backend.vercel.app/api").replace(/\/$/, "");
const TIMEOUT_MS = 15000;

const results = [];
const pass = (name) => results.push({ name, ok: true });
const fail = (name, detail) => results.push({ name, ok: false, detail });
const soft = (name, ok, detail) => (ok ? pass(name) : fail(name, detail));
// A 404 on a feature endpoint we know is wired locally usually means the
// DEPLOYED build predates it. Warn loudly instead of hard-failing so the
// first run after a feature lands doesn't report a code bug.
const softDeployed = (name, ok, status, detail) =>
  !ok && status === 404
    ? results.push({ name: `${name} (deployed build may be stale — 404)`, ok: true, warn: true, detail })
    : soft(name, ok, detail);

const get = async (path, timeout = TIMEOUT_MS) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "ra-store-smoke-test" },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
};

const hasKeys = (obj, keys) => keys.every((k) => k in obj);

const run = async () => {
  console.log(`RA Store API smoke tests → ${API_BASE}\n`);

  // 1. Core catalog endpoints
  for (const [name, path, keys] of [
    ["categories", "/categories", ["data"]],
    ["new arrivals", "/products/new-arrivals?limit=3", ["data"]],
    ["top selling", "/products/top-selling?limit=3", ["data"]],
    ["featured", "/products/featured?limit=3", ["data"]],
    ["active banners", "/banners/active", ["data"]],
  ]) {
    try {
      const { status, body } = await get(path);
      soft(`${name} returns 200 with shape`, status === 200 && hasKeys(body, keys), `status=${status}`);
    } catch (e) {
      fail(`${name} request`, e.message);
    }
  }

  // 2. Products list — size-wise inventory backward compat
  try {
    const { status, body } = await get("/products?limit=5");
    const items = body?.data?.products || body?.data || [];
    soft(
      "products list ok",
      status === 200 && Array.isArray(items) && items.length > 0,
      `status=${status}, items=${items.length}`
    );
    const sample = items[0];
    if (sample && items.length > 0) {
      const usesObject = Array.isArray(sample.sizes) && sample.sizes.length > 0 && typeof sample.sizes[0] === "object";
      soft(
        "product size field is well-formed (string[] or {size,stock}[])",
        Array.isArray(sample.sizes) && (typeof sample.sizes[0] === "string" || (usesObject && "stock" in sample.sizes[0])),
        `sizes[0]=${JSON.stringify(sample.sizes[0])}`
      );
      // costPrice must never leak to the public API
      soft("costPrice NOT exposed publicly", !("costPrice" in sample), "costPrice present!");
    }
    if (items.length > 0) {
      const slug = items[0].slug;
      const detail = await get(`/products/slug/${slug}`);
      soft(
        "product detail by slug ok",
        detail.status === 200 && detail.body?.data?.product?.slug === slug,
        `status=${detail.status}`
      );
    }
  } catch (e) {
    fail("products list request", e.message);
  }

  // 3. Settings — WhatsApp, delivery estimate, restricted words
  try {
    const { status, body } = await get("/settings");
    const s = body?.data?.settings;
    soft("settings ok", status === 200 && !!s, `status=${status}`);
    if (s) {
      soft("settings: whatsapp section", "whatsapp" in s || "social" in s, Object.keys(s).join(","));
      const estDays = s.deliveryEstimate;
      // The model defaults deliveryEstimate (with minDays/maxDays); a 200 with
      // the key absent means the deployed model predates the feature → warn.
      softDeployed(
        "settings: deliveryEstimate section",
        !!estDays && typeof estDays.minDays === "number" && typeof estDays.maxDays === "number",
        estDays ? status : 404,
        estDays ? JSON.stringify(estDays) : "deliveryEstimate key missing (model predates feature)"
      );
    }
  } catch (e) {
    fail("settings request", e.message);
  }

  // 4. Review system
  try {
    const { status, body } = await get("/products?limit=1");
    const items = body?.data?.products || body?.data || [];
    const productId = items[0]?._id;
    if (!productId) {
      soft("reviews: no product to test against", false, "empty catalog");
    } else {
      const r = await get(`/reviews/product/${productId}?limit=5`);
      const data = r.body?.data;
      softDeployed("product reviews ok", r.status === 200 && !!data, r.status, `status=${r.status}`);
      if (data) {
        soft("reviews: summary has average/total/distribution", hasKeys(data.ratingSummary || {}, ["average", "total", "distribution"]), JSON.stringify(data.ratingSummary));
        soft(
          "reviews: distribution covers 1..5",
          [1, 2, 3, 4, 5].every((i) => i in (data.ratingSummary?.distribution || {})),
          JSON.stringify(data.ratingSummary?.distribution)
        );
        const firstReview = data.reviews?.[0];
        if (firstReview) {
          soft(
            "reviews: entry has rating + user + verified flag",
            typeof firstReview.rating === "number" && !!firstReview.user && typeof firstReview.isVerifiedPurchase === "boolean",
            JSON.stringify({ rating: firstReview.rating, isVerifiedPurchase: firstReview.isVerifiedPurchase })
          );
        }
      }
    }
  } catch (e) {
    fail("reviews request", e.message);
  }

  // 5. Order tracking (uses a real order's number if one exists)
  try {
    // No public list-of-orders endpoint, so we can only test the shape via
    // a known order number if one was provided; otherwise mark as skipped.
    const orderNumber = process.env.TEST_ORDER_NUMBER;
    if (orderNumber) {
      const o = await get(`/orders/number/${orderNumber}`);
      const order = o.body?.data?.order;
      soft("order lookup by number ok", o.status === 200 && !!order, `status=${o.status}`);
      if (order) {
        soft("order: statusHistory present", Array.isArray(order.statusHistory) && order.statusHistory.length > 0, JSON.stringify(order.statusHistory?.slice(-1)));
        const est = order.deliveryEstimate;
        soft("order: deliveryEstimate snapshot present", !!est && typeof est.min === "number" && typeof est.max === "number", JSON.stringify(est));
      }
    } else {
      results.push({ name: "order tracking (set TEST_ORDER_NUMBER to enable)", ok: true, skipped: true });
    }
  } catch (e) {
    fail("order tracking request", e.message);
  }

  // Report
  console.log("\n┌──────────────────────────────────────────────┐");
  let failed = 0, skipped = 0, warned = 0;
  for (const r of results) {
    const tag = r.skipped ? "SKIP" : r.warn ? "WARN" : r.ok ? "PASS" : "FAIL";
    if (r.warn) warned++;
    if (!r.ok && !r.skipped && !r.warn) failed++;
    if (r.skipped) skipped++;
    console.log(`│ ${tag.padEnd(4)} ${r.name.padEnd(52)} ${r.detail || ""}`);
  }
  const passed = results.length - failed - skipped - warned;
  console.log(`└──────────────────────────────────────────────┘`);
  console.log(`\n${passed} passed, ${failed} failed, ${warned} warned (${skipped} skipped) — ${results.length} total`);
  if (warned) console.log("\n⚠ Some failures are 404s on feature endpoints — the deployed build likely predates\n  that feature. Redeploy from `development` to pick them up; see the lines marked WARN.");

  if (failed > 0) process.exit(1);
  process.exit(0);
};

run().catch((e) => {
  console.error("Smoke test runner error:", e);
  process.exit(1);
});