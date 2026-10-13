const mongoose = require("mongoose");

const userNotificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    related_record_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    read_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "user_notifications",
  }
);

module.exports = mongoose.model("UserNotification", userNotificationSchema);
