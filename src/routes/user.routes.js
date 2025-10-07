import { Router } from "express";
import { registerUser,loginUser,logoutUser, getAllUsers, getUserById, findUserByQuery, changeBio,changeContact,changeEmail,changeFullname,changePassword,enterNewPassword ,deleteProfile, changeAvatar } from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
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


userRouter.route("/enter-new-password").patch(verifyJWT, enterNewPassword);
userRouter.route("/change-fullname").patch(verifyJWT, changeFullname);
userRouter.route("/change-password").patch(verifyJWT, changePassword);
userRouter.route("/change-contact").patch(verifyJWT, changeContact);
userRouter.route("/change-email").patch(verifyJWT, changeEmail);
userRouter.route("/change-bio").patch(verifyJWT, changeBio);
userRouter.route("/change-avatar").patch(verifyJWT, upload.single("avatar"), changeAvatar);


userRouter.route("/delete-profile").delete(verifyJWT, deleteProfile);

export {userRouter}