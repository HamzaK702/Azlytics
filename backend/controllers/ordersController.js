import {getOrdersTrend ,  calculateOrderTimeDifferences , calculateAOV} from "../services/ordersService.js";


export const ordersTrend = async (req, res) => {
  try {
    const trends = await getOrdersTrend();
    res.json(trends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getOrderTimeDifferences = async (req, res) => {
  try {
    const timeDifferences = await calculateOrderTimeDifferences();
    res.json(timeDifferences);
  } catch (error) {
    console.error('Error fetching order time differences:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAOV = async (req, res) => {
  try {
    const aovData = await calculateAOV();
    res.json(aovData);
  } catch (error) {
    console.error('Error fetching AOV data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};




