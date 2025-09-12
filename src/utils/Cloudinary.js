import dotenv from 'dotenv'
dotenv.config()

import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});


async function uploadOnCloudinary(localFilePath) {
  try {
    if (!localFilePath) {
      console.log("No local file path provided");
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

   //  console.log("response is : ",response);
    
   //  console.log(" File Uploaded on Cloudinary:", response.url);
   fs.unlinkSync(localFilePath)
    return response;

  } catch (error) {
    console.error("Cloudinary Upload Error:", error.message);
    fs.unlinkSync(localFilePath); 
    return null;
  }
}

export { uploadOnCloudinary };