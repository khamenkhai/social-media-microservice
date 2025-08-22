require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const proxy = require("express-http-proxy");

const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client
const redisClient = new Redis(process.env.REDIS_URL);

// Security middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiter
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    },
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  })
);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);

  if (req.body && Object.keys(req.body).length > 0) {
    logger.info(`Body: ${JSON.stringify(req.body)}`);
  }

  next();
});

// Proxy helper
const createProxy = (serviceUrl, options = {}) =>
  proxy(serviceUrl, {
    proxyReqPathResolver: (req) => req.originalUrl.replace(/^\/v1/, "/api"),
    proxyErrorHandler: (err, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(500).json({ message: "Internal server error", error: err.message });
    },
    ...options,
  });

// Identity Service
app.use(
  "/v1/auth",
  createProxy(process.env.IDENTITY_SERVICE_URL, {
    proxyReqOptDecorator: (proxyReqOpts) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(`[Identity Service] Status: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  })
);

// Post Service
app.use(
  "/v1/posts",
  validateToken,
  createProxy(process.env.POST_SERVICE_URL, {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(`[Post Service] Status: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  })
);

// Media Service
app.use(
  "/v1/media",
  validateToken,
  createProxy(process.env.MEDIA_SERVICE_URL, {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"]?.startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(`[Media Service] Status: ${proxyRes.statusCode}`);
      return proxyResData;
    },
  })
);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`🔑 Identity Service: ${process.env.IDENTITY_SERVICE_URL}`);
});
