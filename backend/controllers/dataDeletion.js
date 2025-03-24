import dotenv from "dotenv";
import FormDeletionSchema from "../models/formDeletion.js";
import UserSchema from "../models/userModel.js";
dotenv.config();
export const dataDeletionController = async (req, res) => {
  try {
    const { shopId, shopName, userId } = req.body;

    // Validation
    if (!shopId || !shopName || !userId) {
      return res
        .status(400)
        .send("User Id, Shop Id, and Shop Name are required");
    }

    // Check for existing data deletion request
    const existingData = await FormDeletionSchema.findOne({ shopId });
    if (existingData) {
      return res.status(400).send({
        error: "Shop Data Deletion Request already raised",
      });
    }

    // Check if the user exists
    const user = await UserSchema.findById(userId); // Added `await` here
    if (user) {
      // Add request to the database
      await new FormDeletionSchema({
        shopId,
        shopName,
      }).save();

      // Update user's shopifyConnected field to false
      await UserSchema.findOneAndUpdate(
        { _id: userId },
        { shopifyConnected: false },
        { new: true }
      );

      res.status(200).send("Deletion Request Successfully Raised");
    } else {
      res.status(403).send("User not found with this id");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      error,
    });
  }
};
