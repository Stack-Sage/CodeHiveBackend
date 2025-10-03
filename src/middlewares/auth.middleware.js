import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { Student } from "../models/student.model.js";

export const verifyJWT = asyncHandler(async(req , res , next)=>{
   try {
      
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
   
      if(!token){
         throw new ApiError(401,"Unauthorized Request")
      }
      const decodedToken  =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
   
      const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
   
      if(!user){
         throw new ApiError(401,"Invalid Access Token ")
      }
   
      req.user = user;
      next()
   } catch (error) {
      throw new ApiError(401,error?.message || "Invalid Access Token ")
   }

})

export const verifyJWTStu = asyncHandler(async(req , res , next)=>{
   try {

      const token = req.cookies?.accessTokenStu || req.header("Authorization")?.replace("Bearer ","")
   
      if(!token){
         throw new ApiError(401,"Unauthorized Request")
      }
      const decodedToken  =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
   
      const student = await Student.findById(decodedToken?._id).select("-password -refreshToken")

      if(!student){
         throw new ApiError(401,"Invalid Access Token ")
      }

      req.student = student;
      next()
   } catch (error) {
      throw new ApiError(401,error?.message || "Invalid Access Token ")
   }

})
