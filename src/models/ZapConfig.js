import mongoose from "mongoose";

const ZapConfigSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true, index: true },
  numero: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
}, { collection: "zap_configs" });

export default mongoose.model("ZapConfig", ZapConfigSchema);