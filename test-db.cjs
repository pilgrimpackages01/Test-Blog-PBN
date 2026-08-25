const mongoose = require('mongoose');
require('dotenv').config();
console.log("URI:", process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected!");
  process.exit(0);
}).catch(e => {
  console.error("Failed:", e);
  process.exit(1);
});
