import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log("NO URI FOUND");
  process.exit(0);
}

console.log("Attempting to connect to:", uri.replace(/:([^:@]+)@/, ':****@'));

mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESS");
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERROR", err.message);
    process.exit(1);
  });
