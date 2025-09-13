import mongoose from "mongoose";

let isConnected = false;

async function ConnectDB() {
  if (isConnected) return;

  try {
    mongoose.set("strictQuery", true);
    mongoose.set("bufferCommands", false); 

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });

    isConnected = true;
    console.log("MongoDB connected:", conn.connection.host);
  } catch (error) {
    console.error("MongoDB connection failed:", {
      message: error.message,
      reason: error.reason?.message,
      code: error.code,
    });
    throw error; 
  }
}

export default ConnectDB;