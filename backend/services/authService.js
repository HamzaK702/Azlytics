
// Import necessary modules
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

// Function to store user data in the database and return an access token
const registerFirebaseUser = async (userData) => {
  const { name, email, uid } = userData;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const newUser = new User({ name, email, uid });
  await newUser.save();

  const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, {
    expiresIn: '1d', // Set token expiration to 1 day
  });

  return { user: newUser, token };
};

// Function to log in a Firebase-authenticated user and return an access token
const loginFirebaseUser = async (uid) => {
  const user = await User.findOne({ uid });

  if (!user) {
    throw new Error('User not found');
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d', // Set token expiration to 1 day
  });

  return { user, token };
};

// Authenticate function to verify the token
const authenticate = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default { registerFirebaseUser, loginFirebaseUser, authenticate };
