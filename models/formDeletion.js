import mongoose from "mongoose";

const formDeletionSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true,
    unique: true,
  },
  shopName: {
    type: String,
    required: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("UninstalledShops", formDeletionSchema);
