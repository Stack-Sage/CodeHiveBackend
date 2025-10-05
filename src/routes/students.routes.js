import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  changeBio,
  changeContact,
  changeEmail,
  changeAvatar,
  changeFullname,
  changePassword,
  deleteProfile,
} from "../controllers/user.controller.js";
import { roleGuard } from "../middlewares/roleGuard.middleware.js";
import { unifyUser } from "../middlewares/unifyUser.middleware.js";
// import your existing auth middleware that populates req.user (e.g., verifyJWT)
import { verifyJWT } from "../middlewares/auth.middleware.js"; // ...existing code/import...

const router = Router();

// All these reuse the same controller, just gated for "student"
router.use(verifyJWT, unifyUser, roleGuard("student"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);

// Protected profile changes (examples, add others as needed)
router.patch("/me/bio", changeBio);
router.patch("/me/contact", changeContact);
router.patch("/me/email", changeEmail);
router.patch("/me/fullname", changeFullname);
router.patch("/me/avatar", changeAvatar);
router.patch("/me/password", changePassword);
router.delete("/me", deleteProfile);

// ...export default...
export default router;
