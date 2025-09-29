import mongoose, { model, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const studentSchema = new Schema({
   avatar:{
      type:String,
   },
   username:{
      type:String,
      required:true
   },
   email:{
      type:String,
      required:true,
      unique:true
   },
   password:{
      type:String,
      required:true
   },
   refreshToken:{
      type:String,
      default:""
   }
},{timestamps:true});

const Student = model("Student", studentSchema);

studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next()
});

studentSchema.methods.isPasswordCorrect = async function(password){
   const result = await bcrypt.compare(password,this.password)
   return result
} 

studentSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id: this._id,
      email:this.email,
      username:this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}
studentSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}


export default Student;




