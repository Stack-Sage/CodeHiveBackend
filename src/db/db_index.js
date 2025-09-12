
import mongoose from "mongoose";


async function ConnectDB() {
   try {

   

      const result =await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)

      for(let i = 0 ; i < 6 ; i++){
         for(let j = 0 ; j< 5 ; j++){
            console.log(" * ")
         }
      }

      console.log("Mongo DB connected successfully",result.connection.host);
 
   } catch (error) {
      console.log("Mongo DB connection failed : ",error);
   }
  
}

export default ConnectDB;
