// Import necessary modules
import dotenv from "dotenv";
import authService from "../services/authService.js";

dotenv.config();

// Register function for Firebase-authenticated users
const registerFirebaseUser = async (req, res) => {
  //Arham4: tumhe frontend pr userShopId milgaya hoga query usko user register krwatay waqt idhr bhejo ga
  try {
    const userData = req.body;
    const { userShopId } = req.query;
    const { user, token } = await authService.registerFirebaseUser(
      userData,
      userShopId
    ); //Arham5: woh user shopId iss function me bhejo

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login function for Firebase-authenticated users
const loginFirebaseUser = async (req, res) => {
  try {
    const { uid } = req.body;
    const { user, token } = await authService.loginFirebaseUser(uid);
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// Authenticate function to verify the token
const authenticate = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = authService.authenticate(token);
    res.status(200).json(decoded);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export default { registerFirebaseUser, loginFirebaseUser, authenticate };
