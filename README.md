# RA Store Backend — Quick Reference

## Run
```bash
cd RA-store-beckend
yarn dev          # nodemon
yarn start        # production
```

## Seed Admin (run once)
```js
// seedAdmin.js
const mongoose = require("mongoose");
const User = require("./src/models/user");
require("dotenv").config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const exists = await User.findOne({ email: "admin@rastore.com" });
  if (!exists) {
    await User.create({
      name: "Admin",
      email: "admin@rastore.com",
      password: "admin123",
      role: "admin",
    });
    console.log("✅ Admin created: admin@rastore.com / admin123");
  } else {
    console.log("Admin already exists");
  }
  process.exit(0);
})();
```

Run: `node seedAdmin.js`

## API Endpoints

### Public
- `GET  /api/categories` — active categories
- `GET  /api/categories/:slug`
- `GET  /api/products?page=1&limit=12&category=slug&sort=newest&search=...&minPrice=&maxPrice=&size=&availability=&sale=true`
- `GET  /api/products/slug/:slug` + related
- `GET  /api/products/new-arrivals?limit=8`
- `GET  /api/products/top-selling?limit=8`
- `GET  /api/products/featured?limit=8`
- `POST /api/orders` — place COD order
- `GET  /api/orders/number/:orderNumber` — customer order lookup
- `POST /api/contact`
- `POST /api/subscribers`
- `GET  /api/settings`

### Admin (requires `Authorization: Bearer <token>`)
- `POST /api/auth/login` → `{ token, user }`
- `GET  /api/auth/profile`
- `GET  /api/dashboard/stats`
- `GET  /api/dashboard/customers`
- `GET  /api/categories/admin/all`
- `POST /api/categories`
- `PUT  /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET  /api/products/admin/all?search=&category=&status=`
- `GET  /api/products/:id`
- `POST /api/products`
- `PUT  /api/products/:id`
- `DELETE /api/products/:id`
- `GET  /api/orders?status=&startDate=&endDate=`
- `GET  /api/orders/:id`
- `PATCH /api/orders/:id/status` → `{ status }`
- `GET  /api/contact?unread=true`
- `PATCH /api/contact/:id/read`
- `DELETE /api/contact/:id`
- `GET  /api/subscribers`
- `PUT  /api/settings` — partial nested update
- `POST /api/upload` — multipart/form-data, field `images`, max 10 → `{ urls: [...] }`

### Static
- `/uploads/<filename>` — served images

## Conventions
- Response: `{ success, message, data }` (sendSuccess / sendError)
- Auth: JWT `{ userId }`, middleware sets `req.user`
- Pagination: `{ page, limit, totalCount, totalPages, hasNextPage, hasPrevPage }`
- Stock & sales auto-managed on order placement/cancel
