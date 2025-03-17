import authService from "../services/authService.js";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Authenticate and decode token using your service
    const decoded = authService.authenticate(token);

    // Extract userShopId and attach to request
    req.userShopId = decoded.userShopId;
    console.log("🚀 ~ authMiddleware ~ decoded.userShopId:", req.userShopId);
    req.user = decoded; // Optional: in case you need full decoded data elsewhere

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authMiddleware;
