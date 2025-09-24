import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  title: String,
  category: String,
  location: String,
  address: String,
  startDate: Date,
  endDate: Date,
  description: String,
  source: String,
  // 修正 1：型別改為 Boolean
  isFree: { type: Boolean, default: false }, 
  status: { type: String, default: "approved" },
  // 修正 2：保留正確的 imageUrl，刪除重複的
  imageUrl: String, 
  likes: { type: Number, default: 0 },
  comments: [commentSchema],
  // 修正 3：型別改為 String
  linkUrl: String, 
  // 修正 1：型別改為 Boolean
  isRecommended: { type: Boolean, default: false } 
});

const Event = mongoose.model("Event", eventSchema);
export default Event;