import mongoose from "mongoose";


async function connectDB(){

   try {
      
      const connectionResponse = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)

      console.log(`MongoDB connected : DB HOST : ${connectionResponse.connection.host}`)
      
   } catch (error) {
      console.log("MONGODB connection error: ",error);
      process.exit(1)
   }
}


export default connectDB