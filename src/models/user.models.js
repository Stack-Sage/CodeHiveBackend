import mongoose, { model, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema = new Schema({
  roles: {
    type: [String],
    enum: ["student", "educator"],
    default: ["student"],
    index: true,
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,

  },
  avatar: {
    type: String, 
  },
  country:{
    type: String,
  },
  skills:{
    type: [String],
    required: function () {
      return Array.isArray(this.roles) && this.roles.includes("educator");
    }
  },
  bio: {
    type: String,
    required: function () {
      return Array.isArray(this.roles) && this.roles.includes("educator");
    }
  },
  price: {
    type: Number,
    min: 0,
    required: function () {
      return Array.isArray(this.roles) && this.roles.includes("educator");
    }, 
  },
 
  dob:{
    type: Date,
  },
 
}, {
  timestamps: true,
  
})


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next()
});

userSchema.methods.isPasswordCorrect = async function(password){
   const result = await bcrypt.compare(password,this.password)
   return result
} 

userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      roles: this.roles,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  )
}

export const User = model("User",userSchema)

