import dotenv from "dotenv";
import FormDeletionSchema from "../models/formDeletion.js";
// import { formDeletionService } from "../services/facebookService.js";
dotenv.config();

export const dataDeletionController = async (req, res) => {
  try {
    const { shopId, shopName } = req.body;

    // validation
    if (!shopId || !shopName) {
      return res.status(400).send("Shop Id and Name is required");
    }

    // existing data check
    const existingData = await FormDeletionSchema.findOne({ shopId });
    if (existingData) {
      return res.status(400).send({
        error: "Shop Data Deletion Request already raised",
      });
    }

    // adding req in db
    await new FormDeletionSchema({
      shopId,
      shopName,
    }).save();

    res.status(200).send("Deletion Request Successfully Raised");
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error,
    });
  }
};
