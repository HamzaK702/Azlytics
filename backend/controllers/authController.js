import authService from '../services/authService.js';

const register = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await authService.register(userData);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export default { register, login };
