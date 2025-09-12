
import mongoose from "mongoose";


async function ConnectDB() {
   try {
      const result = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
      console.log("Mongo DB connected successfully",result.connection.host);
   } catch (error) {
      console.log("Mongo DB connection failed : ",error);
   }
  
}

export default ConnectDB;
