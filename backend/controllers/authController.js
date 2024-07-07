// import authService from '../services/authService.js';
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';

// dotenv.config();

// const register = async (req, res) => {
//   try {
//     const userData = req.body;
//     const newUser = await authService.register(userData);
//     res.status(201).json(newUser);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const { user, token } = await authService.login(email, password);
//     res.status(200).json({ user, token });
//   } catch (error) {
//     res.status(401).json({ message: error.message });
//   }
// };

// const facebookCallback = (req, res) => {
//   try {
//     const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.redirect(`/dashboard?token=${token}`);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const googleCallback = (req, res) => {
//   try {
//     const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.redirect(`/dashboard?token=${token}`);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export default { register, login, facebookCallback, googleCallback };
