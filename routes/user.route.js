import express from "express";
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  getSuggestedUsers,
  followOrUnfollow,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/profile/:id").get(isAuthenticated, getProfile);
router
  .route("/update-profile")
  .patch(isAuthenticated, upload.single("profilePicture"), updateProfile);
router.route("/suggestions").get(isAuthenticated, getSuggestedUsers);
router.route("/follow-or-unfollow/:id").post(isAuthenticated, followOrUnfollow);

export default router;
