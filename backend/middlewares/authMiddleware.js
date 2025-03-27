import authService from "../services/authService.js";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = authService.authenticate(token);

    req.userShopId = decoded.userShopId; //ARHM1: We take the userShopId from here
    console.log("🚀 ~ authMiddleware ~ decoded.userShopId:", req.userShopId);
    req.user = decoded; 

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authMiddleware;
