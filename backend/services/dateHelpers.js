// dateHelpers.js

import moment from 'moment';

/**
 * Calculates the start and end dates based on the provided filter.
 * @param {string} filter - The date range filter (e.g., 'yesterday', '7d', '30d', '3m', '6m', '12m', 'custom_date_range').
 * @param {string} [customStartDate] - The custom start date in 'YYYY-MM-DD' format (required if filter is 'custom_date_range').
 * @param {string} [customEndDate] - The custom end date in 'YYYY-MM-DD' format (required if filter is 'custom_date_range').
 * @returns {Object} - An object containing the startDate and endDate.
 */
export const getDateRange = (filter, customStartDate, customEndDate) => {
  const now = new Date();
  let startDate;
  let endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999); // Set endDate to the end of today

  // Set start and end dates based on filter
  if (filter === 'yesterday') {
    startDate = moment().subtract(1, 'days').startOf('day').toDate();
    endDate = moment().subtract(1, 'days').endOf('day').toDate();
  } else if (filter === '7d') {
    startDate = moment().subtract(7, 'days').startOf('day').toDate();
  } else if (filter === '30d') {
    startDate = moment().subtract(30, 'days').startOf('day').toDate();
  } else if (filter === '3m') {
    startDate = moment().subtract(3, 'months').startOf('day').toDate();
  } else if (filter === '6m') {
    startDate = moment().subtract(6, 'months').startOf('day').toDate();
  } else if (filter === '12m') {
    startDate = moment().subtract(12, 'months').startOf('day').toDate();
  } else if (filter === 'custom_date_range') {
    if (!customStartDate || !customEndDate) {
      throw new Error('Custom start and end dates are required for custom_date_range filter');
    }
    startDate = moment(customStartDate, 'YYYY-MM-DD').startOf('day').toDate();
    endDate = moment(customEndDate, 'YYYY-MM-DD').endOf('day').toDate();
  } else {
    throw new Error('Invalid filter specified');
  }

  return { startDate, endDate };
};

/**
 * Generates an array of dates between startDate and endDate, inclusive.
 * @param {Date} startDate - The start date.
 * @param {Date} endDate - The end date.
 * @returns {Date[]} - An array of Date objects.
 */
export const generateDateArray = (startDate, endDate) => {
  const dates = [];
  let currentDate = moment(startDate);

  while (currentDate <= moment(endDate)) {
    dates.push(currentDate.toDate());
    currentDate = currentDate.clone().add(1, 'day');
  }

  return dates;
};

/**
 * Generates an array of weekly periods between startDate and endDate.
 * Each period represents the start date of the week (Monday).
 * @param {Date} startDate - The start date.
 * @param {Date} endDate - The end date.
 * @returns {Date[]} - An array of Date objects representing week start dates.
 */
export const generateWeeklyPeriods = (startDate, endDate) => {
  const periods = [];
  let currentDate = moment(startDate).startOf('isoWeek');

  while (currentDate <= moment(endDate)) {
    periods.push(currentDate.toDate());
    currentDate = currentDate.clone().add(1, 'week');
  }

  return periods;
};

/**
 * Generates an array of monthly periods between startDate and endDate.
 * Each period represents the start date of the month.
 * @param {Date} startDate - The start date.
 * @param {Date} endDate - The end date.
 * @returns {Date[]} - An array of Date objects representing month start dates.
 */
export const generateMonthArray = (startDate, endDate) => {
  const months = [];
  let currentDate = moment(startDate).startOf('month');

  while (currentDate <= moment(endDate)) {
    months.push(currentDate.toDate());
    currentDate = currentDate.clone().add(1, 'month');
  }

  return months;
};
