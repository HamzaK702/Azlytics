import User from "../models/userModel.js";
import UserShop from "../models/userShopModel.js";
import authService from "../services/authService.js";

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = authService.authenticate(token);

        if (decoded) {
            req.user = await User.findById(decoded.id);
            if (req.user) {
                req.user.shop = await UserShop.findOne({ userId: req.user.id });
                req.userShopId = req.user.shop._id;
            }
        }

        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

export default authMiddleware;
