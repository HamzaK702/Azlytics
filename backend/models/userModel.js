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
  password: {
    type: String,
    required: function() {
      return !this.facebookId && !this.googleId; // Password is required only if not using Facebook or Google login
    }
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents without this field to be indexed
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents without this field to be indexed
  },
  profilePicture: {
    type: String
  },
  // Add any other fields you need
});

const User = mongoose.model('User', userSchema);
export default User;
