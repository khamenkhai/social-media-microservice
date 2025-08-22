const Media = require("../models/Media");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const uploadMedia = async (req, res) => {
  logger.info("🚀 Starting media upload");

  try {
    if (!req.file) {
      logger.error("❌ No file found in request");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!",
      });
    }

    const userId = req.userId;

    console.log(`********************* userid : ${userId}`);

    if (!userId) {
      logger.error("❌ No userId found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing userId",
      });
    }

    // // ✅ Check if user exists
    // const existingUser = await User.findById(userId);
    // if (!existingUser) {
    //   logger.warn(`⚠️ User not found: ${userId}`);
    //   return res.status(404).json({
    //     success: false,
    //     message: "User not found",
    //   });
    // }

    const { originalname, mimetype } = req.file;
    logger.info(`📂 File received: name=${originalname}, type=${mimetype}`);
    logger.info("☁️ Uploading to Cloudinary...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(`✅ Uploaded to Cloudinary (public_id: ${cloudinaryUploadResult.public_id})`);

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    logger.info(`✔️ Media saved in DB (mediaId: ${newlyCreatedMedia._id})`);

    return res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload successful",
    });
  } catch (error) {
    logger.error(`❌ Error creating media: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Error creating media",
    });
  }
};

const getAllMedias = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      logger.error("❌ No userId found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Missing userId",
      });
    }

    // ✅ Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      logger.warn(`⚠️ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await Media.find({ userId });

    if (result.length === 0) {
      logger.info(`ℹ️ No media found for user ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Can't find any media for this user",
      });
    }

    logger.info(`✅ Found ${result.length} medias for user ${userId}`);
    return res.status(200).json({ success: true, medias: result });
  } catch (error) {
    logger.error(`❌ Error fetching medias: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Error fetching medias",
    });
  }
};

module.exports = { uploadMedia, getAllMedias };
