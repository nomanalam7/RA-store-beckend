const dns = require("dns");
dns.setServers(["1.1.1.1"]);

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./src/models/user");
const Category = require("./src/models/category");
const Product = require("./src/models/product");
const Order = require("./src/models/order");
const Setting = require("./src/models/setting");
const Contact = require("./src/models/contact");
const Subscriber = require("./src/models/subscriber");

// ─── 1. USERS ───────────────────────────────────────────────
const usersData = [
  {
    name: "Admin",
    email: "admin@rastore.com",
    password: "admin123",
    phone: "03001234567",
    role: "admin",
    isActive: true,
  },
  {
    name: "Ahmed Khan",
    email: "ahmed@example.com",
    password: "customer123",
    phone: "03009876543",
    role: "customer",
    isActive: true,
  },
  {
    name: "Sara Ali",
    email: "sara@example.com",
    password: "customer123",
    phone: "03111222333",
    role: "customer",
    isActive: true,
  },
  {
    name: "Usman Raza",
    email: "usman@example.com",
    password: "customer123",
    phone: "03214455667",
    role: "customer",
    isActive: true,
  },
];

// ─── 2. CATEGORIES ──────────────────────────────────────────
const categoriesData = [
  {
    name: "Football Jerseys",
    slug: "football-jerseys",
    description:
      "Shop statement football jerseys inspired by the world's biggest clubs, national teams, and the culture of the beautiful game.",
    image: "/uploads/categories/football-jerseys.jpg",
    isFeatured: true,
    isActive: true,
  },
  {
    name: "T-Shirts",
    slug: "t-shirts",
    description:
      "Everyday T-shirts made for effortless streetwear looks, comfortable fits, and easy styling from day to night.",
    image: "/uploads/categories/t-shirts.jpg",
    isFeatured: true,
    isActive: true,
  },
  {
    name: "Hoodies & Trousers",
    slug: "hoodies-trousers",
    description:
      "Build your everyday streetwear rotation with comfortable hoodies and versatile trousers designed for a relaxed modern fit.",
    image: "/uploads/categories/hoodies-trousers.jpg",
    isFeatured: true,
    isActive: true,
  },
];

// ─── 3. PRODUCTS (categorySlug se link hoga) ────────────────
const productsData = [
  {
    name: "Portugal 2026 Home Jersey",
    slug: "portugal-2026-home-jersey",
    categorySlug: "football-jerseys",
    shortDescription:
      "A bold Portugal-inspired football jersey made for match days, streetwear looks, and everyday wear.",
    description: `
      <p>Bring football culture into your everyday style with the Portugal 2026 Home Jersey.</p>
      <p>Designed with a clean athletic silhouette and a comfortable lightweight feel, this jersey works just as well on match day as it does with your everyday streetwear rotation.</p>
      <p>Pair it with relaxed trousers, denim, or shorts for an effortless football-inspired look.</p>
      <ul>
        <li>Comfortable lightweight fabric</li>
        <li>Relaxed athletic fit</li>
        <li>Breathable feel for everyday wear</li>
        <li>Suitable for casual and sports-inspired outfits</li>
      </ul>
    `,
    price: 2499,
    salePrice: 1999,
    images: [
      "/uploads/products/portugal-2026-home-jersey.jpg",
      "/uploads/products/portugal-2026-home-jersey-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 35,
    sku: "RA-FJ-001",
    material: "100% Polyester",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "Real Madrid 2026 Home Jersey",
    slug: "real-madrid-2026-home-jersey",
    categorySlug: "football-jerseys",
    shortDescription:
      "A classic white football jersey inspired by the timeless style of Real Madrid.",
    description: `
      <p>Keep your football wardrobe clean and iconic with the Real Madrid 2026 Home Jersey.</p>
      <p>The classic design makes it an easy choice for football fans while the comfortable construction keeps it suitable for everyday casual wear.</p>
      <p>Wear it with jeans, cargos, or track pants for a simple football-meets-streetwear fit.</p>
      <ul>
        <li>Classic football-inspired design</li>
        <li>Lightweight and comfortable fabric</li>
        <li>Regular athletic fit</li>
        <li>Ideal for match days and casual styling</li>
      </ul>
    `,
    price: 2499,
    salePrice: 2099,
    images: [
      "/uploads/products/real-madrid-2026-home-jersey.jpg",
      "/uploads/products/real-madrid-2026-home-jersey-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 40,
    sku: "RA-FJ-002",
    material: "100% Polyester",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "Argentina 2026 Away Jersey",
    slug: "argentina-2026-away-jersey",
    categorySlug: "football-jerseys",
    shortDescription:
      "A football-inspired Argentina jersey combining a classic sporting identity with modern streetwear energy.",
    description: `
      <p>Make your football collection stand out with the Argentina 2026 Away Jersey.</p>
      <p>Built around a comfortable everyday fit, this jersey is designed for supporters who want their football style to work beyond the stadium.</p>
      <p>Its versatile look pairs easily with cargos, denim, shorts, and sneakers.</p>
      <ul>
        <li>Soft and lightweight construction</li>
        <li>Comfortable everyday fit</li>
        <li>Breathable athletic fabric</li>
        <li>Football and streetwear inspired styling</li>
      </ul>
    `,
    price: 2399,
    salePrice: null,
    images: [
      "/uploads/products/argentina-2026-away-jersey.jpg",
      "/uploads/products/argentina-2026-away-jersey-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 30,
    sku: "RA-FJ-003",
    material: "100% Polyester",
    isFeatured: false,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "Black Football Graphic Jersey",
    slug: "black-football-graphic-jersey",
    categorySlug: "football-jerseys",
    shortDescription:
      "A minimal black football jersey created for a darker, cleaner streetwear look.",
    description: `
      <p>Football doesn't always have to look traditional.</p>
      <p>The Black Football Graphic Jersey brings a darker streetwear aesthetic to the football-inspired wardrobe. Its minimal base makes it easy to style while the graphic detailing adds character to the look.</p>
      <p>Perfect for casual outings, football sessions, match nights, and everyday streetwear.</p>
      <ul>
        <li>Minimal black base</li>
        <li>Football-inspired graphic detailing</li>
        <li>Lightweight comfortable fabric</li>
        <li>Relaxed casual fit</li>
      </ul>
    `,
    price: 2299,
    salePrice: 1899,
    images: [
      "/uploads/products/black-football-graphic-jersey.jpg",
      "/uploads/products/black-football-graphic-jersey-back.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 45,
    sku: "RA-FJ-004",
    material: "100% Polyester",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "RA Essential Oversized T-Shirt",
    slug: "ra-essential-oversized-t-shirt",
    categorySlug: "t-shirts",
    shortDescription:
      "A clean oversized essential designed for everyday comfort and effortless streetwear styling.",
    description: `
      <p>The RA Essential Oversized T-Shirt is built around one simple idea: everyday pieces should look good without trying too hard.</p>
      <p>Featuring a relaxed oversized silhouette and soft cotton construction, it is an easy foundation for your daily wardrobe.</p>
      <p>Style it with cargos, denim, trousers, or shorts for a clean contemporary look.</p>
      <ul>
        <li>Oversized relaxed fit</li>
        <li>Soft breathable cotton</li>
        <li>Minimal RA branding</li>
        <li>Designed for everyday wear</li>
      </ul>
    `,
    price: 1799,
    salePrice: 1499,
    images: [
      "/uploads/products/ra-essential-oversized-tshirt.jpg",
      "/uploads/products/ra-essential-oversized-tshirt-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 60,
    sku: "RA-TS-001",
    material: "100% Cotton",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "RA Signature Graphic T-Shirt",
    slug: "ra-signature-graphic-t-shirt",
    categorySlug: "t-shirts",
    shortDescription:
      "A statement graphic tee designed to bring personality to your everyday streetwear rotation.",
    description: `
      <p>The RA Signature Graphic T-Shirt is made for days when a basic tee just isn't enough.</p>
      <p>Featuring a bold graphic direction with a comfortable everyday silhouette, it brings a statement element to simple outfits.</p>
      <p>Pair it with relaxed trousers, cargos, or sneakers for a complete streetwear look.</p>
      <ul>
        <li>Premium-feel cotton fabric</li>
        <li>Relaxed modern fit</li>
        <li>Statement graphic artwork</li>
        <li>Comfortable for everyday use</li>
      </ul>
    `,
    price: 1899,
    salePrice: null,
    images: [
      "/uploads/products/ra-signature-graphic-tshirt.jpg",
      "/uploads/products/ra-signature-graphic-tshirt-back.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 50,
    sku: "RA-TS-002",
    material: "100% Cotton",
    isFeatured: false,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "RA Heavyweight Oversized T-Shirt",
    slug: "ra-heavyweight-oversized-t-shirt",
    categorySlug: "t-shirts",
    shortDescription:
      "A heavyweight oversized tee with a structured feel for premium everyday streetwear outfits.",
    description: `
      <p>Made for the oversized fit lovers.</p>
      <p>The RA Heavyweight Oversized T-Shirt features a more substantial cotton construction with a structured silhouette that holds its shape while remaining comfortable.</p>
      <p>Its clean design makes it a versatile base for layered outfits and modern streetwear styling.</p>
      <ul>
        <li>Heavyweight cotton construction</li>
        <li>Oversized silhouette</li>
        <li>Structured premium feel</li>
        <li>Easy to style and layer</li>
      </ul>
    `,
    price: 2199,
    salePrice: 1799,
    images: [
      "/uploads/products/ra-heavyweight-tshirt.jpg",
      "/uploads/products/ra-heavyweight-tshirt-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 40,
    sku: "RA-TS-003",
    material: "100% Heavyweight Cotton",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "RA Essential Pullover Hoodie",
    slug: "ra-essential-pullover-hoodie",
    categorySlug: "hoodies-trousers",
    shortDescription:
      "A clean everyday hoodie with a relaxed fit, soft feel, and understated RA branding.",
    description: `
      <p>The RA Essential Pullover Hoodie is designed for everyday comfort with a clean streetwear aesthetic.</p>
      <p>Its relaxed fit and soft interior make it an easy layer for cooler evenings, casual days, and everyday city wear.</p>
      <p>Keep the look minimal with matching trousers or create contrast with denim and sneakers.</p>
      <ul>
        <li>Relaxed unisex fit</li>
        <li>Soft fleece interior</li>
        <li>Adjustable hood</li>
        <li>Minimal RA branding</li>
        <li>Comfortable everyday layer</li>
      </ul>
    `,
    price: 2999,
    salePrice: 2499,
    images: [
      "/uploads/products/ra-essential-hoodie.jpg",
      "/uploads/products/ra-essential-hoodie-back.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 35,
    sku: "RA-HD-001",
    material: "Cotton Blend Fleece",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "RA Oversized Street Hoodie",
    slug: "ra-oversized-street-hoodie",
    categorySlug: "hoodies-trousers",
    shortDescription:
      "A heavyweight oversized hoodie made for relaxed fits and bold everyday streetwear.",
    description: `
      <p>Go oversized with the RA Oversized Street Hoodie.</p>
      <p>Designed around a relaxed streetwear silhouette, this hoodie gives you the extra room and weight needed for a comfortable layered outfit.</p>
      <p>Pair it with wide-leg trousers, cargos, or your favourite sneakers for an effortless urban look.</p>
      <ul>
        <li>Oversized streetwear fit</li>
        <li>Heavyweight fabric</li>
        <li>Soft fleece interior</li>
        <li>Large kangaroo pocket</li>
        <li>Designed for layering</li>
      </ul>
    `,
    price: 3499,
    salePrice: 2999,
    images: [
      "/uploads/products/ra-oversized-street-hoodie.jpg",
      "/uploads/products/ra-oversized-street-hoodie-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 25,
    sku: "RA-HD-002",
    material: "80% Cotton / 20% Polyester",
    isFeatured: true,
    isActive: true,
    salesCount: 0,
  },

  {
    name: "RA Relaxed Cargo Trousers",
    slug: "ra-relaxed-cargo-trousers",
    categorySlug: "hoodies-trousers",
    shortDescription:
      "Relaxed-fit cargo trousers designed to complete modern streetwear outfits with everyday practicality.",
    description: `
      <p>The RA Relaxed Cargo Trousers are built for versatility.</p>
      <p>The relaxed silhouette gives you a comfortable everyday fit while multiple utility pockets add function without taking away from the clean streetwear aesthetic.</p>
      <p>Wear them with oversized tees, football jerseys, hoodies, and everyday sneakers.</p>
      <ul>
        <li>Relaxed modern fit</li>
        <li>Utility cargo pockets</li>
        <li>Durable everyday fabric</li>
        <li>Comfortable waistband</li>
        <li>Easy to pair with streetwear pieces</li>
      </ul>
    `,
    price: 2799,
    salePrice: 2299,
    images: [
      "/uploads/products/ra-relaxed-cargo-trousers.jpg",
      "/uploads/products/ra-relaxed-cargo-trousers-detail.jpg",
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 30,
    sku: "RA-TR-001",
    material: "Cotton Twill",
    isFeatured: false,
    isActive: true,
    salesCount: 0,
  },
];

// ─── 4. SETTINGS (singleton) ─────────────────────────────────
const settingsData = {
  key: "site",

  general: {
    storeName: "RA STORE",
    logo: "/uploads/brand/logo.png",
    favicon: "/uploads/brand/favicon.ico",
    contactEmail: "rastore@support.com",
    phone: "",
    address: "Karachi, Sindh, Pakistan",
  },

  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
    whatsapp: "",
  },

  shipping: {
    deliveryCharge: 200,
    freeShippingThreshold: 3000,
  },

  about: {
    heading: "About RA STORE",

    description:
      "RA STORE is a Karachi-based online fashion destination built around football culture, everyday essentials, and modern streetwear. From statement football jerseys to oversized T-shirts, hoodies, and relaxed trousers, we bring together pieces made for the way you actually dress.",

    story: `
      RA STORE started with a simple idea: clothing should feel personal.

      We wanted to create an online store that brings together the energy of football, the comfort of everyday clothing, and the attitude of modern streetwear — all in one place.

      Based in Karachi, RA STORE is built for a generation that does not want to dress by a single rule. One day it might be a football jersey with cargos and sneakers. The next, it might be an oversized T-shirt, hoodie, or relaxed pair of trousers. Your style changes with your mood, and your clothes should move with you.

      Football is a major part of the culture behind RA STORE. The jerseys, the clubs, the players, the match-day energy, and the communities around the game have always been more than just sport. They are part of identity and street culture.

      At the same time, we believe your wardrobe should go beyond jerseys. That is why RA STORE is expanding into everyday essentials and streetwear pieces that are easy to wear, easy to style, and made for real life.

      Our approach is simple: focus on strong designs, comfortable fits, versatile pieces, and a shopping experience that feels straightforward.

      RA STORE is not about following every trend.

      It is about finding pieces that fit your world and wearing them your way.
    `,

    mission:
      "Our mission is to make modern, expressive, and comfortable fashion accessible to customers across Pakistan while building a brand that connects football culture with everyday streetwear.",

    vision:
      "Our vision is to grow RA STORE into a recognised Pakistani fashion and streetwear brand known for its distinctive identity, quality products, and strong connection with the next generation of customers.",

    images: [
      "/uploads/about/ra-store-story.jpg",
      "/uploads/about/ra-store-fashion.jpg",
    ],
  },

  home: {
    hero: {
      headline: "Wear It Your Way.",

      subtext:
        "Football culture. Everyday essentials. Modern streetwear. Discover pieces made for your style.",

      primaryCtaText: "Shop Collection",
      primaryCtaLink: "/collections",

      secondaryCtaText: "Explore Jerseys",
      secondaryCtaLink: "/collections?category=football-jerseys",

      image: "/uploads/home/hero-banner.jpg",
    },

    promo: {
      active: true,

      title: "Fresh Fits. New Energy.",

      subtitle:
        "Discover the latest RA STORE pieces, from football jerseys to everyday streetwear essentials.",

      highlight: "Up To 20% Off",

      ctaText: "Shop Sale",
      ctaLink: "/collections?sale=true",

      image: "/uploads/home/promo-banner.jpg",
    },

    aboutPreview: {
      title: "Built For Your Style",

      text:
        "RA STORE is a Karachi-based online fashion store bringing football culture and modern streetwear together. From statement jerseys to everyday T-shirts, hoodies, and trousers — find your fit and wear it your way.",

      image: "/uploads/home/about-preview.jpg",
    },
  },

  footer: {
    description:
      "RA STORE — Karachi-based online fashion and streetwear. Football jerseys, everyday essentials, and modern fits made for your style.",

    copyright: "© 2026 RA STORE. All rights reserved.",
  },
};

// ─── 5. CONTACTS ─────────────────────────────────────────────
const contactsData = [
  { name: "Ali Hassan", email: "ali.hassan@gmail.com", phone: "03001112233", message: "Do you have size XXL in the football jerseys?", isRead: true },
  { name: "Fatima Noor", email: "fatima.n@gmail.com", phone: "03114445566", message: "What is the delivery time to Karachi?", isRead: true },
  { name: "Bilal Ahmed", email: "bilal.a@yahoo.com", phone: "", message: "Can I exchange if size doesn't fit?", isRead: false },
  { name: "Zainab Malik", email: "zainab.m@gmail.com", phone: "03217778899", message: "Is the oversized street hoodie available in medium?", isRead: false },
  { name: "Hamza Sheikh", email: "hamza@outlook.com", phone: "03331234567", message: "Bulk order discount for 20 jerseys?", isRead: false },
  { name: "Ayesha Khan", email: "ayesha.k@gmail.com", phone: "03451234567", message: "Love the Portugal jersey! When is the next drop?", isRead: true },
  { name: "Omar Farooq", email: "omar.f@gmail.com", phone: "", message: "Payment methods besides COD?", isRead: false },
  { name: "Hira Rizvi", email: "hira.r@gmail.com", phone: "03009988776", message: "Order #RA-1003 not received yet. Please help.", isRead: false },
];

// ─── 6. SUBSCRIBERS ──────────────────────────────────────────
const subscribersData = [
  { email: "subscriber1@gmail.com" },
  { email: "subscriber2@gmail.com" },
  { email: "subscriber3@gmail.com" },
  { email: "fashionlover.pk@gmail.com" },
  { email: "streetwear.fan@yahoo.com" },
  { email: "ahmed.khan@gmail.com" },
  { email: "sara.style@gmail.com" },
  { email: "deals@rastore.com" },
  { email: "newsletter.user1@hotmail.com" },
  { email: "newsletter.user2@hotmail.com" },
  { email: "lahore.fashion@gmail.com" },
  { email: "karachi.street@gmail.com" },
  { email: "islamabad.wear@gmail.com" },
  { email: "multan.style@gmail.com" },
  { email: "rawalpindi.tees@gmail.com" },
];

// ─── 7. ORDERS (productSlug se link — seed logic mein resolve hoga) ──
// NOTE: productSlug values updated to match the new productsData above.
const ordersData = [
  {
    orderNumber: "RA-1001",
    customer: { fullName: "Ahmed Khan", phone: "03009876543", email: "ahmed@example.com", city: "Lahore", address: "House 45, Block C, Johar Town", notes: "Call before delivery" },
    items: [{ productSlug: "portugal-2026-home-jersey", size: "L", quantity: 2 }, { productSlug: "ra-essential-oversized-t-shirt", size: "M", quantity: 1 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "delivered", stockRestored: false,
  },
  {
    orderNumber: "RA-1002",
    customer: { fullName: "Sara Ali", phone: "03111222333", email: "sara@example.com", city: "Karachi", address: "Flat 302, Clifton Block 2", notes: "" },
    items: [{ productSlug: "ra-essential-pullover-hoodie", size: "M", quantity: 1 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "shipped", stockRestored: false,
  },
  {
    orderNumber: "RA-1003",
    customer: { fullName: "Usman Raza", phone: "03214455667", email: "usman@example.com", city: "Islamabad", address: "Street 12, F-10 Markaz", notes: "Leave at reception" },
    items: [{ productSlug: "black-football-graphic-jersey", size: "XL", quantity: 1 }, { productSlug: "ra-relaxed-cargo-trousers", size: "L", quantity: 1 }],
    discount: 100, deliveryCharges: 0, paymentMethod: "cod", status: "processing", stockRestored: false,
  },
  {
    orderNumber: "RA-1004",
    customer: { fullName: "Fatima Noor", phone: "03451239876", email: "fatima.n@gmail.com", city: "Multan", address: "Gulgasht Colony, House 78", notes: "" },
    items: [{ productSlug: "real-madrid-2026-home-jersey", size: "M", quantity: 3 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "confirmed", stockRestored: false,
  },
  {
    orderNumber: "RA-1005",
    customer: { fullName: "Bilal Ahmed", phone: "03007776655", email: "bilal.a@yahoo.com", city: "Rawalpindi", address: "Satellite Town, Lane 4", notes: "" },
    items: [{ productSlug: "ra-oversized-street-hoodie", size: "L", quantity: 1 }],
    discount: 0, deliveryCharges: 0, paymentMethod: "cod", status: "pending", stockRestored: false,
  },
  {
    orderNumber: "RA-1006",
    customer: { fullName: "Zainab Malik", phone: "03217778899", email: "zainab.m@gmail.com", city: "Faisalabad", address: "Madina Town, Block A", notes: "Gift wrap please" },
    items: [{ productSlug: "argentina-2026-away-jersey", size: "XL", quantity: 1 }, { productSlug: "ra-signature-graphic-t-shirt", size: "M", quantity: 2 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "delivered", stockRestored: false,
  },
  {
    orderNumber: "RA-1007",
    customer: { fullName: "Hamza Sheikh", phone: "03331234567", email: "hamza@outlook.com", city: "Peshawar", address: "University Road, Shop 5", notes: "" },
    items: [{ productSlug: "ra-heavyweight-oversized-t-shirt", size: "M", quantity: 2 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "cancelled", stockRestored: true,
  },
  {
    orderNumber: "RA-1008",
    customer: { fullName: "Ayesha Khan", phone: "03451234567", email: "ayesha.k@gmail.com", city: "Lahore", address: "DHA Phase 6, Street 22", notes: "" },
    items: [{ productSlug: "ra-relaxed-cargo-trousers", size: "M", quantity: 1 }, { productSlug: "ra-essential-oversized-t-shirt", size: "L", quantity: 2 }],
    discount: 150, deliveryCharges: 0, paymentMethod: "cod", status: "delivered", stockRestored: false,
  },
  {
    orderNumber: "RA-1009",
    customer: { fullName: "Omar Farooq", phone: "03005554433", email: "omar.f@gmail.com", city: "Hyderabad", address: "Latifabad Unit 7", notes: "" },
    items: [{ productSlug: "ra-signature-graphic-t-shirt", size: "L", quantity: 1 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "pending", stockRestored: false,
  },
  {
    orderNumber: "RA-1010",
    customer: { fullName: "Hira Rizvi", phone: "03009988776", email: "hira.r@gmail.com", city: "Quetta", address: "Jinnah Road, Near Mall", notes: "Urgent delivery" },
    items: [{ productSlug: "ra-oversized-street-hoodie", size: "L", quantity: 1 }, { productSlug: "ra-essential-pullover-hoodie", size: "M", quantity: 1 }],
    discount: 0, deliveryCharges: 200, paymentMethod: "cod", status: "shipped", stockRestored: false,
  },
];

// ─── SEED RUNNER ─────────────────────────────────────────────
function unitPrice(product) {
  return product.salePrice != null && product.salePrice < product.price
    ? product.salePrice
    : product.price;
}

function buildOrderItems(items, productMap) {
  return items.map((item) => {
    const p = productMap[item.productSlug];
    if (!p) throw new Error(`Product not found: ${item.productSlug}`);
    const up = unitPrice(p);
    return {
      product: p._id,
      name: p.name,
      slug: p.slug,
      image: p.images[0] || "",
      size: item.size,
      price: p.price,
      salePrice: p.salePrice,
      unitPrice: up,
      quantity: item.quantity,
      lineTotal: up * item.quantity,
    };
  });
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Users
    for (const u of usersData) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`User created: ${u.email}`);
      }
    }

    // Categories
    await Category.deleteMany({});
    const categories = await Category.insertMany(categoriesData);
    const catMap = Object.fromEntries(categories.map((c) => [c.slug, c._id]));
    console.log(`Categories: ${categories.length}`);

    // Products
    await Product.deleteMany({});
    const productsToInsert = productsData.map(({ categorySlug, ...rest }) => ({
      ...rest,
      category: catMap[categorySlug],
    }));
    const products = await Product.insertMany(productsToInsert);
    const productMap = Object.fromEntries(products.map((p) => [p.slug, p]));
    console.log(`Products: ${products.length}`);

    // Settings
    await Setting.findOneAndUpdate({ key: "site" }, settingsData, { upsert: true, new: true });
    console.log("Settings upserted");

    // Contacts
    await Contact.deleteMany({});
    await Contact.insertMany(contactsData);
    console.log(`Contacts: ${contactsData.length}`);

    // Subscribers
    await Subscriber.deleteMany({});
    await Subscriber.insertMany(subscribersData);
    console.log(`Subscribers: ${subscribersData.length}`);

    // Orders
    await Order.deleteMany({});
    for (const o of ordersData) {
      const items = buildOrderItems(o.items, productMap);
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      const total = subtotal - (o.discount || 0) + (o.deliveryCharges || 0);
      await Order.create({ ...o, items, subtotal, total });
    }
    console.log(`Orders: ${ordersData.length}`);

    console.log("\n✅ Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();