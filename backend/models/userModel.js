
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  uid: {
    type: String,
    required: true,
    unique: true,
    sparse: true // Allows multiple documents without this field to be indexed
  },
  shopifyConnected: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const User = mongoose.model('User', userSchema);
export default User;
