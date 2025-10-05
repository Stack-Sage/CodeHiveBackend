import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import validator from "validator";
import { accessTokenOptions, options, refreshTokenOptions } from "../constants/constant.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(500, "Tokens can't be generated!");
  }
};



const registerStudent = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log("req.body in registerStudent:", req.body);

   if([username, email,password].find((field) => !field || field.trim() === "")){
      throw new ApiError(400,"All fields are required")
   }

   if (!validator.isEmail(email)) {
       throw new ApiError(400, "Invalid email format!");
     }
   
  const [existingByEmail, existingByUsername] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ username: username.trim() })
  ]);
  if (existingByEmail) throw new ApiError(400, "User with this email already exists");
  if (existingByUsername) throw new ApiError(400, "Username already taken");



  let avatarUrl = ""; 

  if (req?.file?.path) {

    const avatar = await uploadOnCloudinary(req.file.path);
    if (avatar) {
      avatarUrl = avatar.url;
    }
  }

  const student = await User.create({
    roles: ["student"],
    username: username?.trim(),
    fullname: username?.trim(), // map username to fullname for students
    email,
    password,
    avatar: avatarUrl,
  });

  if (!student) {
    throw new ApiError(500, "Failed to create student");
  }

  return res.status(201).json(
    new ApiResponse(201, student, "Student registered successfully")
  );
});



const loginStudent = asyncHandler(async (req, res) => {
   const { email, password } = req.body;

   if(email==="" || password===""){
      throw new ApiError(400,"Email and password are required")
   }

   const student = await User.findOne({ email, roles: { $in: ["student"] } }).select("+password +refreshToken");

   if (!student) {
       throw new ApiError(404, "Student not found");
   }

   const isMatch = await student.isPasswordCorrect(password);

   if (!isMatch) {
       throw new ApiError(401, "Invalid password");
   }

    const { accessToken, refreshToken } = await generateAccessRefreshToken(
       student._id
     );

     const loggedInUser = await User.findById(student._id).select(
       "-password -refreshToken "
     );
   

    return res
       .status(200)
       .cookie("accessTokenStu", accessToken, accessTokenOptions)
       .cookie("refreshTokenStu", refreshToken, refreshTokenOptions)
       .cookie("isStudentLoggedIn",true,options)
       .json(
         new ApiResponse(
           200,
           {
             user: loggedInUser,
             accessToken,
             refreshToken,
           },
           "Student logged in Successfully"
         )
       );
});


const refreshAccessTokenStu = asyncHandler(async (req, res) => {
  const incomingRefreshTokenStu =
    req.cookies.refreshTokenStu || req.body.refreshTokenStu;

  if (!incomingRefreshTokenStu) {
    throw new ApiError(401, "Unautharized Request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshTokenStu,
      process.env.REFRESH_TOKEN_SECRET
    );

    console.log(decodedToken);

    const student = await User.findById(decodedToken?._id).select("+refreshToken");

    if (!student) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshTokenStu !== student?.refreshToken) {
      throw new ApiError(401, "Refresh Token is either Expired or used");
    }

    const { accessToken, refreshToken } = await generateAccessRefreshToken(student._id);

    return res
      .status(200)
      .cookie("accessTokenStu", accessToken, accessTokenOptions)
      .cookie("refreshTokenStu", refreshToken, refreshTokenOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token Refreshed Successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const logoutStudent = asyncHandler(async (req, res) => {
  const id = req.student?._id || req.user?._id;
  const student = await User.findById(id).select("+refreshToken");
  if (!student) throw new ApiError(404, "Student not found");
  student.refreshToken = null;
  await student.save({ validateBeforeSave: false });

  return res
    .status(200)
    .clearCookie("accessTokenStu", options)
    .clearCookie("refreshTokenStu", options)
    .clearCookie("isStudentLoggedIn", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});


const changeName = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) throw new ApiError(400, "Name is required");

  const student = await User.findByIdAndUpdate(
    req.student?._id || req.user?._id,
    { username, fullname: username },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Name updated successfully"));
});


const changeEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(400, "Email already in use");
  }

  const student = await User.findByIdAndUpdate(
    (req.student?._id || req.user?._id),
    { email },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Email updated successfully"));
});


const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  const student = await User.findById(req.student?._id || req.user?._id).select("+password");
  if (!student) throw new ApiError(404, "Student not found");

  const isMatch = await student.isPasswordCorrect(oldPassword);
  if (!isMatch) throw new ApiError(401, "Old password is incorrect");

  student.password = newPassword; 
  await student.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});


const setNewPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) throw new ApiError(400, "New password is required");

  const student = await User.findById(req.student?._id || req.user?._id).select("+password");
  if (!student) throw new ApiError(404, "Student not found");

  student.password = newPassword;
  await student.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "New password set successfully"));
});

const changeAvatar = asyncHandler(async (req, res) => {
  if (!req?.file?.path) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(req.file.path);
  if (!avatar) throw new ApiError(500, "Failed to upload avatar");

  const student = await User.findByIdAndUpdate(
    req.student?._id || req.user?._id,
    { avatar: avatar.url },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Avatar updated successfully"));
});


const deleteProfile = asyncHandler(async (req, res) => {
  const student = await User.findById(req.student?._id || req.user?._id);
  if (!student) throw new ApiError(404, "Student not found");

  await student.deleteOne(); 


  return res
    .status(200)
    .clearCookie("accessTokenStu", options)
    .clearCookie("refreshTokenStu", options)
    .clearCookie("isStudentLoggedIn", options)
    .json(new ApiResponse(200, {}, "Profile deleted successfully"));
});

const getStudentByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "username is required");
  }

  const student = await User.findOne({
    username,
    roles: { $in: ["student"] },
  }).select("-password -refreshToken");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student fetched successfully"));
});


export {
  registerStudent,
  loginStudent,
  logoutStudent,
  changeName,
  changeEmail,
  changePassword,
  deleteProfile,
  setNewPassword,
  changeAvatar,
  getStudentByUsername,
  refreshAccessTokenStu
};


