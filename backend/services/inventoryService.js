import Order from "../models/BulkTables/BulkOrder/order.js";
import mongoose from "mongoose";

export const getInventory = async (
  filter,
  customStartDate,
  customEndDate,
  groupBy,
  userShopId
) => {
  try {
    console.log("userShopid in the inventory service", userShopId);

    const now = new Date();
    let startDate;
    let endDate;

    switch (filter) {
      case "three_months":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 2);
        startDate.setDate(1);
        endDate = now;
        break;
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        endDate = startDate;
        break;
      case "one_week":
        endDate = new Date(now);
        endDate.setDate(now.getDate() - 1);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "one_month":
        endDate = new Date(now);
        endDate.setDate(now.getDate() - 1);
        startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "six_months":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        endDate = now;
        if (!groupBy) {
          groupBy = "month";
        }
        break;
      case "twelve_months":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        endDate = now;
        break;
      case "custom_date_range":
        if (!customStartDate || !customEndDate) {
          throw new Error(
            "Custom start and end dates are required for custom_date_range filter"
          );
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        throw new Error("Invalid filter specified");
    }

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    if (!groupBy) {
      groupBy = "month";
    }

    let dateFormat;
    let dateStep;
    const dateRange = [];
    if (groupBy === "week") {
      dateFormat = "%Y-W";
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 7)
      ) {
        const weekNumber = getWeekNumber(d);
        const formattedDate = `${d.getFullYear()}-W${String(
          weekNumber
        ).padStart(2, "0")}`;
        dateRange.push({ date: formattedDate, quantitySold: 0 });
      }
    } else if (groupBy === "month") {
      dateFormat = "%Y-%m";
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setMonth(d.getMonth() + 1)
      ) {
        const formattedDate = `${d.getFullYear()}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}`;
        dateRange.push({ date: formattedDate, quantitySold: 0 });
      }
    }

    const pipeline = [
      {
        $match: {
          // userShopId: mongoose.Types.ObjectId(userShopId), // if ObjectId
          createdAt: {
            $gte: new Date(startDateISO),
            $lte: new Date(endDateISO),
          },
        },
      },
      {
        $unwind: "$lineItems",
      },
      {
        $group: {
          _id: {
            productId: "$lineItems.productId",
            productTitle: "$lineItems.title",
            date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          },
          totalQuantitySold: { $sum: "$lineItems.quantity" },
        },
      },
      {
        $group: {
          _id: {
            productId: "$_id.productId",
            productTitle: "$_id.productTitle",
          },
          dates: {
            $push: {
              date: "$_id.date",
              quantitySold: "$totalQuantitySold",
            },
          },
          totalQuantity: { $sum: "$totalQuantitySold" },
        },
      },
      {
        $project: {
          id: "$_id.productId",
          title: "$_id.productTitle",
          dates: 1,
          average: {
            $divide: [
              "$totalQuantity",
              (endDate - startDate) / (1000 * 60 * 60 * 24),
            ],
          },
        },
      },
    ];

    const results = await Order.aggregate(pipeline);

    const finalResults = results.map((product) => {
      const dateValues = [...dateRange];

      product.dates.forEach((d) => {
        const index = dateValues.findIndex((item) => item.date === d.date);
        if (index !== -1) {
          dateValues[index].quantitySold = d.quantitySold;
        }
      });

      return {
        id: product.id,
        title: product.title,
        values: dateValues,
        average: product.average,
      };
    });

    return { products: finalResults };
  } catch (error) {
    console.error("Error fetching orders trend:", error.message);
    throw new Error("Error fetching orders trend");
  }
};

function getWeekNumber(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / (1000 * 60 * 60 * 24);
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

export const getInventoryTableData = async (userShopIdLocale) => {
  try {
    console.log("🚀 ~ getInventoryTableData ~ userShopId:", userShopIdLocale);
    const now = new Date();

    const pipeline = [
      // chnanged here
      {
        $match: {
          userShopId: new mongoose.Types.ObjectId(userShopIdLocale),
        },
      },
      {
        $unwind: "$lineItems",
      },
      {
        $group: {
          _id: {
            productId: "$lineItems.productId",
            productTitle: "$lineItems.title",
            vendor: "$shopName",
          },
          totalQuantity: { $sum: "$lineItems.quantity" },
          totalValue: {
            $sum: { $multiply: ["$lineItems.quantity", "$lineItems.price"] },
          },
          totalSales: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id.productId",
          foreignField: "id",
          as: "productInfo",
        },
      },
      {
        $project: {
          productTitle: "$_id.productTitle",
          inventory: {
            $cond: {
              if: { $gt: ["$totalQuantity", 0] },
              then: { $concat: [{ $toString: "$totalQuantity" }, " In Stock"] },
              else: "0 In Stock",
            },
          },
          status: {
            $cond: {
              if: { $gt: ["$totalQuantity", 0] },
              then: "Active",
              else: "Out of Stock",
            },
          },
          vendor: "$_id.vendor",
          salesChannels: "$totalSales",
          markets: "$totalSales",
          category: { $arrayElemAt: ["$productInfo.category", 0] },
          type: { $arrayElemAt: ["$productInfo.type", 0] },
          totalQuantity: "$totalQuantity",
          weightedAverage: { $divide: ["$totalValue", "$totalQuantity"] },
        },
      },
    ];

    const results = await Order.aggregate(pipeline);

    const tableData = results.map((item) => {
      const weightedAverage = item.weightedAverage || 1;
      const noOfDays = item.totalQuantity / weightedAverage;

      const endingDate = new Date(now);
      endingDate.setDate(endingDate.getDate() + noOfDays);

      let health;
      if (noOfDays < 15) {
        health = "Purple";
      } else if (noOfDays >= 16 && noOfDays <= 25) {
        health = "Light Green";
      } else if (noOfDays >= 26 && noOfDays <= 40) {
        health = "Green";
      } else if (noOfDays >= 41 && noOfDays <= 55) {
        health = "Light Pink";
      } else {
        health = "Blood Red";
      }

      return {
        // product: item.productTitle,
        // status: item.status,
        // inventory: item.inventory,
        // salesChannels: item.salesChannels,
        // markets: item.markets,
        // category: item.category || "N/A",
        // type: item.type || "N/A",
        // vendor: item.vendor || "N/A",
        // noOfDays: noOfDays.toFixed(2),
        // endingDate: endingDate.toISOString().split("T")[0],
        // health: health,
        data,
      };
    });

    return { data: tableData };
  } catch (error) {
    console.error("Error fetching inventory table data:", error.message);
    throw new Error("Error fetching inventory table data");
  }
};
