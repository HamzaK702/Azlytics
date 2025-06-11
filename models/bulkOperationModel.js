import mongoose from "mongoose";

const bulkOperationModelSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "UserShop" }, // Removed `required: true`
    type: { type: String, required: true },
    dataUrl: { type: String, default: null },
    bulkOperationId: { type: String, required: true },
    bulkOperation: { type: Object, default: null },
    status: { type: String, default: null },
    lastChecked: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    totalRecords: { type: Number, default: 0 },
});

const BulkOperation = mongoose.model("BulkOperation", bulkOperationModelSchema);

export default BulkOperation;
