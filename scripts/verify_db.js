
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load from .env.local explicitly
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing (check .env.local)");
    process.exit(1);
}

const main = async () => {
    try {
        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Custom Script: Connected to MongoDB successfully!");
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Custom Script: MongoDB connection error:", err.message);
    }
};

main();
