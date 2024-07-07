// import User from '../models/userModel.js';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';

// const register = async (userData) => {
//   const { name, email, password, role } = userData;
//   const existingUser = await User.findOne({ email });

//   if (existingUser) {
//     throw new Error('User already exists');
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = new User({ name, email, password: hashedPassword, role });
//   await newUser.save();

//   return newUser;
// };

// const login = async (email, password) => {
//   const user = await User.findOne({ email });

//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     throw new Error('Invalid email or password');
//   }

//   const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
//     expiresIn: '1h',
//   });

//   return { user, token };
// };

// const authenticate = (token) => {
//   try {
//     return jwt.verify(token, process.env.JWT_SECRET);
//   } catch (error) {
//     throw new Error('Invalid token');
//   }
// };

// export default { register, login, authenticate };
