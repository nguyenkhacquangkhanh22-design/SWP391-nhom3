const mongoose = require("mongoose");

const contractTemplateSchema = new mongoose.Schema(
  {
    template_code: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    terms_content: {
      type: String,
      required: true,
      trim: true,
    },
    fields: [
      {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        required: { type: Boolean, default: true },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "published", "retired"],
      default: "draft",
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    published_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    published_at: {
      type: Date,
    },
    retired_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    retired_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "contract_templates",
  }
);

contractTemplateSchema.index({ template_code: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("ContractTemplate", contractTemplateSchema);
