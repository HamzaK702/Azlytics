import {
  getChampions,
  getLoyalCustomers,
  getPotentialLoyalists,
  getNewCustomers,
  getPromisingCustomers,
  getNeedAttentionCustomers,
  getAboutToSleepCustomers,
  getCantLoseThemCustomers,
  getAtRiskCustomers,
  getHibernatingCustomers,
} from "../services/customerAnalyticService.js";

export const fetchChampions = async (req, res) => {
  try {
    const champions = await getChampions();
    res.status(200).json({
      status: "success",
      data: champions,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch champions",
      error: error.message,
    });
  }
};

export const fetchLoyalCustomers = async (req, res) => {
  try {
    const loyalCustomers = await getLoyalCustomers();
    res.status(200).json({
      status: "success",
      data: loyalCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch loyal customers",
      error: error.message,
    });
  }
};

export const fetchPotentialLoyalists = async (req, res) => {
  try {
    const potentialLoyalists = await getPotentialLoyalists();
    res.status(200).json({
      status: "success",
      data: potentialLoyalists,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch potential loyalists",
      error: error.message,
    });
  }
};

export const fetchNewCustomers = async (req, res) => {
  try {
    const newCustomers = await getNewCustomers();
    res.status(200).json({
      status: "success",
      data: newCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch new customers",
      error: error.message,
    });
  }
};

export const fetchPromisingCustomers = async (req, res) => {
  try {
    const promisingCustomers = await getPromisingCustomers();
    res.status(200).json({
      status: "success",
      data: promisingCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch promising customers",
      error: error.message,
    });
  }
};

export const fetchNeedAttentionCustomers = async (req, res) => {
  try {
    const needAttentionCustomers = await getNeedAttentionCustomers();
    res.status(200).json({
      status: "success",
      data: needAttentionCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch need attention customers",
      error: error.message,
    });
  }
};

export const fetchAboutToSleepCustomers = async (req, res) => {
  try {
    const aboutToSleepCustomers = await getAboutToSleepCustomers();
    res.status(200).json({
      status: 'success',
      data: aboutToSleepCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch about to sleep customers',
      error: error.message,
    });
  }
};


export const fetchCantLoseThemCustomers = async (req, res) => {
  try {
    const cantLoseThemCustomers = await getCantLoseThemCustomers();
    res.status(200).json({
      status: 'success',
      data: cantLoseThemCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Can’t Lose Them customers',
      error: error.message,
    });
  }
};


export const fetchAtRiskCustomers = async (req, res) => {
  try {
    const atRiskCustomers = await getAtRiskCustomers();
    res.status(200).json({
      status: 'success',
      data: atRiskCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch At Risk customers',
      error: error.message,
    });
  }
};

export const fetchHibernatingCustomers = async (req, res) => {
  try {
    const hibernatingCustomers = await getHibernatingCustomers();
    res.status(200).json({
      status: 'success',
      data: hibernatingCustomers,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Hibernating customers',
      error: error.message,
    });
  }
};




