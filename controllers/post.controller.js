import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";

export const addNewPost = async (req, res) => {
  try {
    const userId = req.id;
    const { caption } = req.body;
    const image = req.file;

    if (!caption && !image) {
      return res
        .status(400)
        .json({ message: "At least one field is required" });
    }

    // image upload
    const optimizedImageBuffer = await sharp(image.buffer)
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
      })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    // buffer to data uri
    const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString(
      "base64"
    )}`;
    const cloudResponse = await cloudinary.uploader.upload(fileUri);
    const post = await Post.create({
      caption,
      image: cloudResponse.secure_url,
      author: userId,
    });

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.posts.push(post._id);
    await user.save();

    await post.populate("author", "-password");

    res.status(201).json({ message: "Post created successfully", post: post });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    // populate author and comments
    const posts = await Post.find()
      .populate([
        { path: "author", select: "-password" },
        { path: "comments.author", select: "-password" },
      ])
      .sort({ createdAt: -1 });

    res.status(200).json({ posts });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId).populate([
      { path: "author", select: "-password" },
      { path: "comments.author", select: "-password" },
    ]);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ post });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserPost = async (req, res) => {
  try {
    const authorId = req.id;
    const posts = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate([
        { path: "author", select: "-password" },
        { path: "comments.author", select: "-password" },
      ]);

    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const likeOrUnlikePost = async (req, res) => {
  try {
    const userId = req.id;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    let liked = false;

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.likes.includes(userId)) {
      // User already liked the post, so unlike it
      post.likes.pull(userId);
    } else {
      // User hasn't liked the post yet, so like it
      post.likes.push(userId);
      liked = true;
    }

    await post.save();

    const user = await User.findById(userId).select("username profilePicture");
    const postOwnerId = post.author.toString();
    if (postOwnerId !== userId) {
      if (liked) {
        const notification = {
          type: "like",
          userId,
          userDetails: user,
          postId,
          message: "Your post was liked",
        };
        const postOwnerSocketId = getReceiverSocketId(postOwnerId);
        io.to(postOwnerSocketId).emit("notification", notification);
      } else {
        const notification = {
          type: "dislike",
          userId,
          userDetails: user,
          postId,
          message: "Your post was disliked",
        };
        const postOwnerSocketId = getReceiverSocketId(postOwnerId);
        io.to(postOwnerSocketId).emit("notification", notification);
      }
    }

    res.status(200).json({ message: "Post liked/unliked successfully", post });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addComment = async (req, res) => {
  try {
    const userId = req.id;
    const postId = req.params.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await Comment.create({
      text,
      author: userId,
      post: postId,
    }).populate("author", "-password");

    post.comments.push(comment._id);
    await post.save();

    res.status(201).json({ message: "Comment added successfully", post });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCommentsByPostId = async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.find({ post: postId }).populate(
      "author",
      "-password"
    );

    res.status(200).json({ comments });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(postId);

    const user = await User.findById(userId);
    user.posts.pull(postId);
    await user.save();

    await Comment.deleteMany({ post: postId });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const bookmarkPost = async (req, res) => {
  try {
    const userId = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findById(userId);

    if (user.bookmarks.includes(postId)) {
      user.bookmarks.pull(postId);
    } else {
      user.bookmarks.push(postId);
    }

    await user.save();

    res.status(200).json({ message: "Post bookmarked/unbookmarked", user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
