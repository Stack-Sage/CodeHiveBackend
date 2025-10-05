import { asyncHandler } from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js"
import { accessTokenOptions, options } from "../constants/constant.js"; // removed refreshTokenOptions
import validator from "validator";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";


const generateAccessTokenOnly = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  const accessToken = user.generateAccessToken();
  return { accessToken };
};


const registerUser = asyncHandler(async (req, res) => {
  const {
    fullname,
    password,
    email,
    dob,
    country,
    bio,
    price,
    skills,
    roles 
  } = req.body;

  if (!roles || !Array.isArray(roles) || !roles.length) {
    throw new ApiError(400, "Role is required");
  }

  if ([fullname, password, email].some((field) => field?.trim?.() === "")) {
    throw new ApiError(400, "Fullname, email, and password are required");
  }

  console.log(fullname, email, roles)

  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid email format!");
  }

  if (roles.includes("educator")) {
    if (!bio || !skills || !price) {
      throw new ApiError(400, "Bio, skills, and price are required for educators");
    }
  }

  // Check for existing user
  const existedUser = await User.findOne({
    email
  });

  if (existedUser) {
    throw new ApiError(409, "Email Already Exists!");
  }


  const avatarLocalPath = req.file?.[0]?.path;

  console.log(avatarLocalPath)

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "No avatar local image found");
  // }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  // if (!avatar) {
  //   throw new ApiError(400, "Please Upload Image!");
  // }

  // Parse skills if string
  let skillsArr = skills;
  if (typeof skills === "string") {
    skillsArr = skills.split(",").map(s => s.trim()).filter(Boolean);
  }

  const user = await User.create({
    roles,
    fullname,
    email,
    password,
    dob,
    country,
    bio,
    price,
    skills: skillsArr,
    avatar: avatar?.url || "",
  });

  const createdUser = await User.findById(user._id).select("-password");
  if (!createdUser) {
    throw new ApiError(500, "User Wasn't Registered");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!"));

})


const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  console.log(email, password, role)

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required!");
  }

  // Find user by email and role
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    roles: role ? [role] : undefined
  });

  if (!user) {
    throw new ApiError(404, "User does not exist! ");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Password is Incorrect!");
  }

  const { accessToken } = await generateAccessTokenOnly(user._id);
  const loggedInUser = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("isLoggedIn", true, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("isLoggedIn", options)
    .json(new ApiResponse(200, "User Logged out Successfully"));
});

const getAllUsers = asyncHandler(async (req, res) => {

  const users = await User.find().select("-password").sort({createdAt:-1}); // removed -refreshToken
  if (!users) {
    throw new ApiError(404, "No users found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched Successfully"));

});

const getUserById = asyncHandler(async (req, res) => {

  const userId = req.params.id;

  const user = await User.findById(userId).select("-password"); // removed -refreshToken

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched Successfully"));
});


const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByQuery = asyncHandler(async (req, res) => {
  const raw = (req.params.query ?? req.query.q ?? "").trim();
  if (!raw) throw new ApiError(400, "Query is required");

  const rx = new RegExp(escapeRegex(raw), "i");

  const users = await User.find({
    $or: [
      { fullname: rx },
      { email: rx },
      { bio: rx },
      { skills: rx },
      { country: rx },
    ],
  })
    .select("-password") 
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, users, "Users fetched Successfully"));
});





const changeEmail  = asyncHandler( async (req,res)=>{
  const { email } = req.body;
  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid email format!");
  }

  const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
  if (exists) {
    throw new ApiError(409, "Email already in use");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id, 
    { $set: { email } },
    { new: true }
  ).select("-password");

  if(!user){  
    throw new ApiError(400, "Unable to update email");
  }

  return res.status(200).json(new ApiResponse(200, user, "Email updated Successfully"));
})


const changeContact  = asyncHandler( async (req,res)=>{
  const { contact } = req.body;

  const exists = await User.findOne({ contact, _id: { $ne: req.user._id } });
  if (exists) {
    throw new ApiError(409, "Phone Number already exists");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id, 
    { $set: { contact } },
    { new: true }
  ).select("-password");

  if(!user){  
    throw new ApiError(400, "Unable to update contact");
  }

  return res.status(200).json(new ApiResponse(200, user, "Contact updated Successfully"));
});

const changeFullname = asyncHandler( async (req,res)=>{
  const { fullname } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id, 
    { $set: { fullname } },
    { new: true }
  ).select("-password");

  if(!user){  
    throw new ApiError(400, "Unable to update fullname");
  }

  return res.status(200).json(new ApiResponse(200, user, "Fullname updated Successfully"));
});

const changeBio = asyncHandler( async (req,res)=>{
  const { bio } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id, 
    { $set: { bio } },
    { new: true }
  ).select("-password");

  if(!user){  
    throw new ApiError(400, "Unable to update bio");
  }

  return res.status(200).json(new ApiResponse(200, user, "Bio updated Successfully"));
});

const changeAvatar = asyncHandler( async (req,res)=>{
  const avatar = req.file?.path;
  if (!avatar) {
    throw new ApiError(400, "No avatar local image found");
  }
  const avatarImage = await uploadOnCloudinary(avatar);
  if (!avatarImage) {
    throw new ApiError(400, "Please Upload Image!");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatarImage.url } },
    { new: true }
  ).select("-password");

  if(!user){  
    throw new ApiError(400, "Unable to update avatar");
  }

  return res.status(200).json(new ApiResponse(200, user, "Avatar updated Successfully"));
});

const changePassword = asyncHandler( async (req,res)=>{
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if(!user){
    throw new ApiError(404, "User not found");
  }

  const isMatch = await user.isPasswordCorrect(oldPassword);
  if(!isMatch){
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json(new ApiResponse(200, {}, "Password updated Successfully"));
})





const enterNewPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));

  });



  const deleteProfile = asyncHandler( async (req,res)=>{
    const user = await User.findByIdAndDelete(req.user._id);

  if(!user){
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("isLoggedIn", options)
    .json(new ApiResponse(200, {}, "Profile deleted successfully"));
});



export {
   registerUser,
   loginUser,
   logoutUser,
   getAllUsers,
   getUserById,
   findUserByQuery,
   changeBio,
   changeContact,
   changeEmail,
   changeAvatar,
   changeFullname,
   changePassword,
   enterNewPassword,
   deleteProfile
}