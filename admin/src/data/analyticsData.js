export const analyticsData = {
  weekly: [
    { label: "Mon", added: 12, wishlist: 6, orders: 3 },
    { label: "Tue", added: 7, wishlist: 0, orders: 4 },
    { label: "Wed", added: 9, wishlist: 5, orders: 3 },
    { label: "Thu", added: 2, wishlist: 1, orders: 6 },
    { label: "Fri", added: 23, wishlist: 1, orders: 2 },
    { label: "Sat", added: 1, wishlist: 9, orders: 5 },
    { label: "Sun", added: 14, wishlist: 7, orders: 1 },
  ],
  monthly: [
    { label: "Jan", added: 35, wishlist: 23, orders: 22 },
    { label: "Feb", added: 25, wishlist: 12, orders: 21 },
    { label: "Mar", added: 40, wishlist: 13, orders: 31 },
    { label: "Apr", added: 20, wishlist: 2, orders: 22 },
    { label: "May", added: 10, wishlist: 3, orders: 8},
    { label: "Jun", added: 13, wishlist: 6, orders: 10 },
    { label: "Jul", added: 11, wishlist: 7, orders: 4 },
    { label: "Aug", added: 48, wishlist: 34, orders: 20 },
    { label: "Sep", added: 28, wishlist: 20, orders: 25 },
    { label: "Oct", added: 30, wishlist: 12, orders: 24 },
    { label: "Nov", added: 10, wishlist: 5, orders: 8 },
    { label: "Dec", added: 34, wishlist: 23, orders: 33},
  ],
  categoryShares: [
    { name: "Menswear", value: 38 },
    { name: "Womenswear", value: 42 },
    { name: "Kids", value: 13 },
    
  ],
  engagementStats: [
    { metric: "Conversion rate", current: 32, change: 4.2 },
    { metric: "Wishlist to cart", current: 58, change: -1.3 },
    { metric: "Repeat buyers", current: 21, change: 2.8 },
  ],
};

export const deriveSummary = (dataset) => {
  const totals = dataset.reduce(
    (acc, point) => {
      acc.added += point.added;
      acc.wishlist += point.wishlist;
      acc.orders += point.orders;
      return acc;
    },
    { added: 0, wishlist: 0, orders: 0 }
  );

  const avg =
    dataset.length !== 0 ? (totals.orders / dataset.length).toFixed(1) : 0;

  return {
    totals,
    avgOrders: Number(avg),
    conversion:
      totals.added === 0 ? 0 : Number(((totals.orders / totals.added) * 100).toFixed(1)),
  };
};

