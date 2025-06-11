import mongoose from "mongoose";

const GoogleInsightSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  adAccountId: { type: String, required: true },
  date: { type: String, required: true },
  insights: [
    {
      campaign_name: String,
      impressions: Number,
      clicks: Number,
      spend: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Index to ensure unique entries per user, ad account, and date
GoogleInsightSchema.index(
  { userId: 1, adAccountId: 1, date: 1 },
  { unique: true }
);

const GoogleAdInsight = mongoose.model("googleAdInsight", GoogleInsightSchema);
export default GoogleAdInsight;
