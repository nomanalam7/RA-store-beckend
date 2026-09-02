process.env.TZ = "Asia/Riyadh";
require("dotenv").config();

const app = require("./src/app");

// Local dev ke liye
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;