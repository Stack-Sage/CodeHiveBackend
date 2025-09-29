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

} from "../controllers/student.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const studentRouter = Router();


studentRouter.route("/register").post(upload.single("avatar"), registerStudent);
studentRouter.route("/login").post(loginStudent);
studentRouter.route("/logout").post(verifyJWT, logoutStudent);


studentRouter.route("/get/:username").get(getStudentByUsername);



studentRouter.route("/change-name").patch(verifyJWT, changeName);
studentRouter.route("/change-email").patch(verifyJWT, changeEmail);
studentRouter.route("/change-password").patch(verifyJWT, changePassword);
studentRouter.route("/set-new-password").patch(verifyJWT, setNewPassword);
studentRouter.route("/change-avatar").patch(verifyJWT, upload.single("avatar"), changeAvatar);

studentRouter.route("/delete-profile").delete(verifyJWT, deleteProfile);

export { studentRouter };
