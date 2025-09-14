import { Router } from "express";
import { registerUser,loginUser,logoutUser, getAllUsers, getUserById, findUserByQuery } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const userRouter = Router()


userRouter.route("/register").post(
  upload.single("avatar"),
  registerUser
);


userRouter.route("/login").post(loginUser);

userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/getAll").get(getAllUsers);
userRouter.route("/get/:id").get(getUserById);
userRouter.route("/search/:query").get(findUserByQuery);

export {userRouter}