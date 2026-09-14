// One-off live-data patch (2026-09-14):
//   1. Point the live Setting doc at rastoresupport@gmail.com + 03152553219
//      (whatsapp in international format for wa.me links).
//   2. Seed 4 realistic reviews (Pakistani names) per product so every listing
//      shows a populated review section. isVerifiedPurchase mirrors the
//      controller's logic (a non-cancelled order w/ this product + email).
// Run with `node src/seed/seedLiveReviews.js`, verify via the API, then delete.
process.env.TZ = "Asia/Riyadh";
require("dotenv").config();

const mongoose = require("mongoose");
const crypto = require("crypto");
const connectDB = require("../core/database");
const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");
const Review = require("../models/review");
const Setting = require("../models/setting");

const SLUGS = [
  "portugal-2026-home-jersey",
  "real-madrid-2026-home-jersey",
  "argentina-2026-away-jersey",
  "black-football-graphic-jersey",
  "ra-essential-oversized-t-shirt",
  "ra-signature-graphic-t-shirt",
  "ra-heavyweight-oversized-t-shirt",
  "ra-essential-pullover-hoodie",
  "ra-oversized-street-hoodie",
  "ra-relaxed-cargo-trousers",
];

// Verified-Purchase reviewers reuse the seeded order customer emails so the
// platform's own order check marks them verified. 4 reviews per product.
const REVIEWS = {
  "portugal-2026-home-jersey": [
    { name: "Ahmed Raza", email: "ahmed@example.com", rating: 5, featured: true, title: "Beautiful quality", comment: "The fabric is genuinely premium and the Portugal red is spot on. Got compliments the very first day I wore it. Stitching is clean and the fit is true to size." },
    { name: "Bilal Hussain", rating: 4, title: "Great fit, runs a bit snug", comment: "Loved the overall look. I am between sizes so I sized up and it fits perfectly over a tee. Print quality is very good for the price." },
    { name: "Hina Khan", rating: 5, title: "Ordered for my brother", comment: "Bought this as a gift and my brother hasn't taken it off since. Delivery was fast and the packaging was neat. Will order again." },
    { name: "Saad Tariq", rating: 4, title: "Worth every rupee", comment: "Good weight fabric, comfortable for daily wear. Chest print looks sharp and hasn't faded after a few washes." },
  ],
  "real-madrid-2026-home-jersey": [
    { name: "Fatima Noor", email: "fatima.n@gmail.com", rating: 5, featured: true, title: "Hala Madrid!", comment: "The white kit looks absolutely stunning. My whole family ordered and the quality is much better than what we expected. Highly recommend." },
    { name: "Usman Ghani", rating: 5, title: "Perfect replica", comment: "Very impressed with the details — the crest and sponsor print are clean. Breathable fabric, great for match day." },
    { name: "Mahnoor Ali", rating: 4, title: "Nice for fans", comment: "Bought as a birthday gift. Colours are accurate and it fits well. Slightly long sleeves for me but that's my height, not a fault." },
    { name: "Danish Ahmed", rating: 5, title: "Top tier quality", comment: "This is my third order from RA Store and they never disappoint. Jersey quality is on par with expensive brands." },
  ],
  "argentina-2026-away-jersey": [
    { name: "Zainab Malik", email: "zainab.m@gmail.com", rating: 5, featured: true, title: "Slice of Argentina", comment: "The away kit looks incredible in person. Fabric is soft and breathable. Wore it for football with friends this week — everyone asked where I got it." },
    { name: "Ali Hassan", rating: 4, title: "Really solid jersey", comment: "Great print quality and comfortable material. Fits a bit loose which I like for a casual football vibe." },
    { name: "Rabia Noor", rating: 5, title: "Brother loved it", comment: "Ordered for my older brother who is a huge Messi fan. The colours and badge detail are perfect. Fast delivery in Karachi." },
    { name: "Fahad Mehmood", rating: 4, title: "Good value", comment: "For the price this is excellent. Lightweight and doesn't feel cheap at all. Would recommend going a size up if you want an oversized look." },
  ],
  "black-football-graphic-jersey": [
    { name: "Usman Raza", email: "usman@example.com", rating: 5, featured: true, title: "Looks even better in person", comment: "The black base with the graphic print is fire. Very well made, thick enough that it doesn't stick to you. My new favourite piece." },
    { name: "Kainat Raza", rating: 4, title: "Stylish and comfy", comment: "Bought this for my husband and he wears it constantly. The graphic print looks premium, washing has been fine so far." },
    { name: "Hamza Farooq", rating: 5, title: "Statement piece", comment: "Exactly as pictured. The design is unique and the quality is proper streetwear level. Arrived in 4 days to Lahore." },
    { name: "Iqra Batool", rating: 3, title: "Nice but sizing", comment: "Quality is good but the fit runs slightly big. I should have gone a size down. Still keeping it because it looks great." },
  ],
  "ra-essential-oversized-t-shirt": [
    { name: "Ayesha Siddiqui", rating: 5, featured: true, title: "Perfect everyday tee", comment: "The oversized fit is exactly what I wanted. Material is thick enough that it holds its shape but still super comfy. Already ordered another colour." },
    { name: "Nauman Anwar", rating: 4, title: "Good quality cotton", comment: "Soft, breathable and the oversized cut drapes nicely. Wash it inside out and it stays perfect." },
    { name: "Eman Siddiqui", rating: 5, title: "My new go-to", comment: "Wears really well, the stitching is solid and it doesn't shrink. Excellent value for money." },
    { name: "Shahzaib Khan", rating: 4, title: "Great basic", comment: "Simple, clean, comfortable. Exactly what you need in a wardrobe. Delivery was quick too." },
  ],
  "ra-signature-graphic-t-shirt": [
    { name: "Omar Farooq", rating: 5, featured: true, title: "Graphics are crisp", comment: "The print quality is honestly top notch — no cracks or fading after several washes. The fit is relaxed and modern." },
    { name: "Laiba Hussain", rating: 4, title: "Trendy and comfy", comment: "Loved the design, very unique than what's in the local market. True to size and soft fabric." },
    { name: "Talha Anwar", rating: 5, title: "Fresh piece", comment: "The signature design catches everyone's attention. Great summer fabric, breathable. Worth the price." },
    { name: "Maryam Javed", rating: 4, title: "Good buy", comment: "Bought for myself and the fit is unisex relaxed — exactly the streetwear look. Arrived well packaged." },
  ],
  "ra-heavyweight-oversized-t-shirt": [
    { name: "Adnan Qureshi", rating: 5, featured: true, title: "Heavyweight done right", comment: "The extra weight makes it drape beautifully and it feels premium. This is how an oversized tee should be made." },
    { name: "Nimra Sheikh", rating: 5, title: "Winter favourite", comment: "Thicker than I expected in a good way — great for layering. Colour hasn't faded after multiple washes." },
    { name: "Zohaib Aslam", rating: 4, title: "Very good quality", comment: "Substantial fabric that keeps shape. Sleeves are well done. Only wish it came in more colourways." },
    { name: "Sana Malik", rating: 4, title: "Happy with purchase", comment: "Nice boxy cut, premium feel. Slightly heavy for summer but perfect for evenings and AC rooms." },
  ],
  "ra-essential-pullover-hoodie": [
    { name: "Sara Ali", email: "sara@example.com", rating: 5, featured: true, title: "Coziest hoodie", comment: "The fleece inside is so soft, my absolute favourite for Karachi winters. Great quality stitching, no pilling after a couple of months." },
    { name: "Abdullah Qureshi", rating: 5, title: "Exactly as photo", comment: "Colour is rich, hood sits well, kangaroo pocket is deep. This hoodie is going to last ages." },
    { name: "Hira Rizvi", rating: 4, title: "Great layering piece", comment: "Comfortable and warm without being bulky. I love the relaxed fit. Delivery was on time." },
    { name: "Hamza Sheikh", rating: 4, title: "Good quality hoodie", comment: "Solid construction and true to size. The fabric has a nice weight to it." },
  ],
  "ra-oversized-street-hoodie": [
    { name: "Bilal Ahmed", email: "bilal.a@yahoo.com", rating: 5, featured: true, title: "Streetwear staple", comment: "The oversized boxy fit is exactly the aesthetic I wanted. Heavy enough to feel premium, print on the back is sharp." },
    { name: "Areeba Akhtar", rating: 5, title: "Better than expected", comment: "Gorgeous fit and the quality is impressive. Wearing it oversized as a girl and it looks amazing." },
    { name: "Waleed Tariq", rating: 4, title: "Solid hoodie", comment: "Good material, stylish cut. Runs generous so go true size or one down for a normal fit." },
    { name: "Momina Khan", rating: 4, title: "Worth the money", comment: "Really comfortable and the colour is exactly as shown. Has become my go-to hoodie." },
  ],
  "ra-relaxed-cargo-trousers": [
    { name: "Ayesha Khan", email: "ayesha.k@gmail.com", rating: 5, featured: true, title: "Perfect cargos", comment: "The relaxed fit is so comfortable and the pockets are actually usable. Fabric is sturdy with a nice taper. Best cargos I've owned." },
    { name: "Imran Shah", rating: 5, title: "Great everyday trousers", comment: "Very comfortable for long hours, looks sharp paired with any tee. Quality stitching throughout." },
    { name: "Mahnoor Ali", rating: 4, title: "Comfy and stylish", comment: "Runs slightly long for me but that's normal for cargos. Love the fit and material quality." },
    { name: "Fiza Imran", rating: 4, title: "Good trousers", comment: "Nice relaxed silhouette, fabric doesn't wrinkle easily. Would buy again in another colour." },
  ],
};

async function upsertUser(name, email) {
  return User.findOneAndUpdate(
    { email },
    {
      $set: { name },
      $setOnInsert: {
        email,
        password: crypto.randomBytes(24).toString("hex"),
        isActive: true,
        role: "customer",
      },
    },
    { upsert: true, new: true }
  );
}

const run = async () => {
  await connectDB();

  // 1. Settings patch (idempotent)
  const set = await Setting.findOneAndUpdate(
    { key: "site" },
    {
      $set: {
        "general.contactEmail": "rastoresupport@gmail.com",
        "general.phone": "03152553219",
        "social.whatsapp": "923152553219",
        "whatsapp.number": "923152553219",
        "whatsapp.enabled": true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  console.log(
    "✓ Settings patched:",
    set.general.contactEmail,
    "| phone:",
    set.general.phone,
    "| wa:",
    set.social.whatsapp
  );

  // 2. Reviews
  let created = 0;
  for (const slug of SLUGS) {
    const product = await Product.findOne({ slug });
    if (!product) {
      console.log("!! product not found:", slug);
      continue;
    }
    const list = REVIEWS[slug] || [];
    for (const r of list) {
      const email = r.email || `${slug}_review_${created}@example.com`;
      const user = await upsertUser(r.name, email);
      const existing = await Review.findOne({ product: product._id, user: user._id });
      if (existing) {
        console.log("  skip (already reviewed):", slug, r.name);
        continue;
      }
      const verified = !!(await Order.findOne({
        "customer.email": email,
        "items.product": product._id,
        status: { $ne: "cancelled" },
      }));
      const review = await Review.create({
        product: product._id,
        user: user._id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isVerifiedPurchase: verified,
        isApproved: true,
        isFeatured: !!r.featured,
      });
      created++;
      console.log(`  ✓ ${slug} → ${r.name} (${r.rating}★, verified=${verified}) id=${review._id}`);
    }
  }

  console.log(`\nDone. Created ${created} reviews across ${SLUGS.length} products.`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});