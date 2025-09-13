import mongoose from "mongoose";

let isConnected = false;

async function ConnectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME, 
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log("MongoDB connected successfully:", conn.connection.host);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

export default ConnectDB;
