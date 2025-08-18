const Post = require("../models/post");
const logger = require("../utils/logger");

const createPost = async (req, res) => {
  try {
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    logger.info("Post created successfully", newlyCreatedPost);

    res.status(200).json({
      success: true,
      message: "Post created successfully!",
    });
  } catch (error) {
    logger.error("Error creating post!", error);
    res.status(500).json({
      success: false,
      message: "Error creating posts!",
    });
  }
};
const getPosts = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error fetching post!", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts!",
    });
  }
};

module.exports = {
  getPosts,
  createPost,
};
