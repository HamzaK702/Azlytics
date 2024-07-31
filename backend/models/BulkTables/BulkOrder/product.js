import mongoose from 'mongoose';
const { Schema } = mongoose;

const productSchema = new Schema({
  id: String,
  title: String,
  handle: String,
});

export default productSchema;
