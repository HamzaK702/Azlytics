// Import necessary modules
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import UserShop from "../models/userShopModel.js";

// Function to store user data in the database and return an access token
const registerFirebaseUser = async (userData, userShopId) => {
    const { name, email, uid } = userData;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("User already exists");
    }

    if (!mongoose.Types.ObjectId.isValid(userShopId)) {
        throw new Error(
            "UserShop Id from params should be mongoose format correct Id"
        );
    }

    // Create a new user
    const newUser = new User({ name, email, uid });
    await newUser.save();

    // Update the UserShop with the user ID if userShopId is provided
    if (userShopId) {
        const updatedShop = await UserShop.findOneAndUpdate(
            { _id: userShopId }, // Locate UserShop by its ID
            { userId: newUser._id }, // Set the userId field
            { new: true } // Return the updated document
        );

        if (!updatedShop) {
            throw new Error("UserShop not found");
        }
    }

    // Generate a JWT token
    const token = jwt.sign(
        {
            id: newUser._id,
            role: newUser.role,
            userShopId,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    return { user: newUser, token };
};

// Function to log in a Firebase-authenticated user and return an access token
const loginFirebaseUser = async (uid, userShopIdFromParams) => {
    const user = await User.findOne({ uid });

    if (!user) {
        throw new Error("User not found");
    }

    let userShopId;
    if (mongoose.Types.ObjectId.isValid(userShopId)) {
        const userShopIdFromParamsMongo = new mongoose.Types.ObjectId(
            userShopIdFromParams
        );
        userShopId = userShopIdFromParamsMongo;
    } else {
        const shop = await UserShop.findOne({ userId: user?._id });
        if (shop) {
            userShopId = shop?._id;
        }
    }
    const token = jwt.sign(
        { id: user._id, role: user.role, userShopId },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d", // Set token expiration to 1 day
        }
    );

    return { user, token };
};

// Authenticate function to verify the token
const authenticate = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error("Invalid token");
    }
};

// Authenticate function to verify the token
const getJwtToken = (user) => {
    try {
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );

        return token;
    } catch (error) {
        throw new Error("Invalid token");
    }
};

export default {
    registerFirebaseUser,
    loginFirebaseUser,
    authenticate,
    getJwtToken,
};
