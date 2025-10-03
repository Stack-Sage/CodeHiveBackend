import { Router } from "express";
import {
  registerStudent,
  loginStudent,
  logoutStudent,
  changeName,
  changeEmail,
  changePassword,
  setNewPassword,
  changeAvatar,
  deleteProfile, 
  getStudentByUsername,
  refreshAccessTokenStu,

} from "../controllers/student.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const studentRouter = Router();


studentRouter.route("/register").post(upload.single("avatar"), registerStudent);

import { verifyJWTStu } from "../middlewares/auth.middleware.js";
studentRouter.route("/login").post(loginStudent);
studentRouter.route("/logout-student").post(verifyJWTStu, logoutStudent);


studentRouter.route("/get/:username").get(getStudentByUsername);


studentRouter.route("/refresh-access-token").get(refreshAccessTokenStu);
studentRouter.route("/change-name").patch(verifyJWTStu, changeName);
studentRouter.route("/change-email").patch(verifyJWTStu, changeEmail);
studentRouter.route("/change-password").patch(verifyJWTStu, changePassword);
studentRouter.route("/set-new-password").patch(verifyJWTStu, setNewPassword);
studentRouter.route("/change-avatar").patch(verifyJWTStu, upload.single("avatar"), changeAvatar);

studentRouter.route("/delete-profile").delete(verifyJWTStu, deleteProfile);

export { studentRouter };
