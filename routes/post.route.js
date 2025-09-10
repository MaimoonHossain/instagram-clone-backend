import express from "express";
import {
  addComment,
  addNewPost,
  getAllPosts,
} from "../controllers/post.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router
  .route("/add-post")
  .post(isAuthenticated, upload.single("image"), addNewPost);

router.route("/all").get(isAuthenticated, getAllPosts);
router.route("/user-post/all").get(isAuthenticated, getUserPost);
router.route("/single-post/:id").get(isAuthenticated, getPostById);
router.route("/like-or-unlike/:id").post(isAuthenticated, likeOrUnlikePost);
router.route("/add-comment/:id").post(isAuthenticated, addComment);
router
  .route("/get-comments-by-post/:id")
  .get(isAuthenticated, getCommentsByPostId);
router.route("/delete-post/:id").delete(isAuthenticated, deletePost);
router.route("/bookmark-post/:id").post(isAuthenticated, bookmarkPost);

export default router;
