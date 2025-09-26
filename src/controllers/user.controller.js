import { asyncHandler } from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js"
import { options } from "../constants/constant.js";
import validator from "validator";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";


const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Tokens can't be generated!");
  }
};


const registerUser = asyncHandler( async(req, res)=>{
   console.log(req.body)  


  const {fullname,password, email,contact,bio, price } = req.body;
  if ([fullname,bio,password,contact, email, password].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All Fields are Required");
  }

  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Invalid email format!");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { contact }],
  });

  if (existedUser) {
    if (existedUser.email === email) {
      throw new ApiError(409, "Email Already Exists !");
    }
    if (existedUser.contact === contact) {
      throw new ApiError(409, "Phone Number already exists !");
    }
  }

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "No avatar local image found");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Please Upload Image!");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    contact,
    email,
    password,
    bio,
    price,
  });
  
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  
  if (!createdUser) {
    throw new ApiError(
      500,
      "User Wasn't Registered "
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!"));

})


const loginUser = asyncHandler(async (req, res) => {
  
  
  const { contact, email, password } = req.body;

  if (!(contact || email)) {
    throw new ApiError(400, "All Fields are Required! ");
  }

  const user = await User.findOne({
    $or: [{ contact }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Password is Incorrect!");
  }

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .cookie("isLoggedIn",true,options)
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

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );


  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unautharized Request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    console.log(decodedToken);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is either Expired or used");
    }

    const { newAccessToken, newRefreshToken } =
      await generateAccessRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, newRefreshToken },
          "Access Token Refreshed Successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});


const getAllUsers = asyncHandler(async (req, res) => {

  const users = await User.find().select("-password -refreshToken").sort({createdAt:-1});
  if (!users) {
    throw new ApiError(404, "No users found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched Successfully"));

});

const getUserById = asyncHandler(async (req, res) => {

  const userId = req.params.id;

  const user = await User.findById(userId).select("-password -refreshToken");

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

    ],
  })
    .select("-password -refreshToken")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, users, "Users fetched Successfully"));
});





const changeEmail  = asyncHandler( async (req,res)=>{

  const {email} = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, 
    {
      $set:{
        email:email 
      }
    },
    {
      new: true,
    }
  )

})


const changeContact  = asyncHandler( async (req,res)=>{

  const {contact} = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, 
    {
      $set:{  
        contact: contact
      }
    },
    {
      new: true,
    }
  )

  if(!user){  
    throw new ApiError(400, "Unable to update contact");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Contact updated Successfully"));
})


const changeFullname = asyncHandler( async (req,res)=>{

  const {fullname} = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, 
    {
      $set:{
        fullname: fullname
      }
    },
    {
      new: true,
    }
  )

  if(!user){  
    throw new ApiError(400, "Unable to update fullname");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Fullname updated Successfully"));
})

const changeBio = asyncHandler( async (req,res)=>{

  const {bio} = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, 
    {
      $set:{
        bio: bio
      }
    },
    {
      new: true,
    }
  )

  if(!user){  
    throw new ApiError(400, "Unable to update bio");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Bio updated Successfully"));
})  


const changePassword = asyncHandler( async (req,res)=>{

  const {oldPassword, newPassword} = req.body;

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

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Password updated Successfully"));
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
    .json(new ApiResponse(200, {}, "Profile deleted successfully"));
});



export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   getAllUsers,
   getUserById,
    findUserByQuery,
    changeBio,
    changeContact,
    changeEmail,

    changeFullname,
    changePassword,
    
    enterNewPassword,
    deleteProfile


}