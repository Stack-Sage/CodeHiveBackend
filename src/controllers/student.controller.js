import Student from "../models/student.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import validator from "validator";
import { options } from "../constants/constant.js";


const generateAccessRefreshToken = async (studentId) => {
  try {
    const student = await Student.findById(studentId);
    const accessToken = student.generateAccessToken();
    const refreshToken = student.generateRefreshToken();

    student.refreshToken = refreshToken;
    await student.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Tokens can't be generated!");
  }
};



const registerStudent = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

   if (!username || !email || !password) {
      throw new ApiError(400, "All fields are required");
   }
   if (!validator.isEmail(email)) {
       throw new ApiError(400, "Invalid email format!");
     }
   
  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    throw new ApiError(400, "Student with this email already exists");
  }



  let avatarUrl = ""; 

  if (req?.file?.path) {

    const avatar = await uploadOnCloudinary(req.file.path);
    if (avatar) {
      avatarUrl = avatar.url;
    }
  }

  const student = await Student.create({
    username,
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

   const student = await Student.findOne({ email });

   if (!student) {
       throw new ApiError(404, "Student not found");
   }

   const isMatch = await student.comparePassword(password);

   if (!isMatch) {
       throw new ApiError(401, "Invalid password");
   }

    const { accessToken, refreshToken } = await generateAccessRefreshToken(
       user._id
     );
   
     const loggedInUser = await User.findById(user._id).select(
       "-password -refreshToken "
     );
   

    return res
       .status(200)
       .cookie("accessTokenStu", accessToken, options)
       .cookie("refreshTokenStu", refreshToken, options)
       .cookie("isStudentLoggedIn",true,options)
       .json(
         new ApiResponse(
           200,
           {
             user: loggedInUser,
             accessToken,
             refreshToken,
           },
           "User logged in Successfully"
         )
       );
});



const logoutStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user._id); 
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

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
  const { fullname } = req.body;

  if (!fullname) throw new ApiError(400, "Name is required");

  const student = await Student.findByIdAndUpdate(
    req.user._id,
    { fullname },
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

  const existing = await Student.findOne({ email });
  if (existing) {
    throw new ApiError(400, "Email already in use");
  }

  const student = await Student.findByIdAndUpdate(
    req.user._id,
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

  const student = await Student.findById(req.user._id);
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

  const student = await Student.findById(req.user._id);
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

  const student = await Student.findByIdAndUpdate(
    req.user._id,
    { avatar: avatar.url },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Avatar updated successfully"));
});


const deleteProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user._id);
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
    throw new ApiError(400, "Username is required");
  }

  const student = await Student.findOne({ username }).select("-password -refreshToken");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, student, "Student fetched successfully"));
});


export { registerStudent, loginStudent, logoutStudent, changeName, changeEmail, changePassword,deleteProfile, setNewPassword, changeAvatar, getStudentByUsername };


