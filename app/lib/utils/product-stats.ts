import { getAllOrders, Order } from '@/app/lib/supabase/orders';
import { getUserById } from '@/app/lib/supabase/users';

export interface ProductSalesStats {
  totalSales: number; // Total quantity sold (only from delivered orders)
  totalRevenue: number; // Total revenue from this product
  ordersCount: number; // Number of orders containing this product
  bestBuyer?: {
    userId: string;
    userName: string;
    userPhone: string;
    quantity: number;
    totalSpent: number;
  };
}

/**
 * Get sales statistics for a product
 * A product is considered "sold" when the order status is "delivered"
 */
export async function getProductStats(productId: string): Promise<ProductSalesStats> {
  const { data: orders, error } = await getAllOrders();
  
  if (error || !orders) {
    return {
      totalSales: 0,
      totalRevenue: 0,
      ordersCount: 0,
    };
  }

  // Filter only delivered orders (products are considered sold when order is delivered)
  const deliveredOrders = orders.filter((order: Order) => order.status === 'delivered');

  let totalSales = 0;
  let totalRevenue = 0;
  let ordersCount = 0;
  const buyerStats: { [userId: string]: { quantity: number; totalSpent: number } } = {};

  deliveredOrders.forEach((order: Order) => {
    if (order.items) {
      order.items.forEach((item) => {
        if (item.product_id === productId) {
          totalSales += item.quantity;
          totalRevenue += item.price * item.quantity;
          ordersCount++;

          // Track buyer statistics
          const userId = order.user_id;
          if (!buyerStats[userId]) {
            buyerStats[userId] = { quantity: 0, totalSpent: 0 };
          }
          buyerStats[userId].quantity += item.quantity;
          buyerStats[userId].totalSpent += item.price * item.quantity;
        }
      });
    }
  });

  // Find best buyer
  let bestBuyer: ProductSalesStats['bestBuyer'] | undefined;
  const buyerEntries = Object.entries(buyerStats);
  if (buyerEntries.length > 0) {
    const [bestUserId, bestStats] = buyerEntries.reduce((best, [userId, stats]) => {
      return stats.quantity > best[1].quantity ? [userId, stats] : best;
    }, buyerEntries[0]);

    // Fetch user details
    const { data: userData } = await getUserById(bestUserId);
    if (userData) {
      bestBuyer = {
        userId: bestUserId,
        userName: userData.name || userData.phone || 'Inconnu',
        userPhone: userData.phone || 'N/A',
        quantity: bestStats.quantity,
        totalSpent: bestStats.totalSpent,
      };
    }
  }

  return {
    totalSales,
    totalRevenue,
    ordersCount,
    bestBuyer,
  };
}

/**
 * Get most sold products
 */
export async function getMostSoldProducts(limit: number = 10): Promise<Array<{ productId: string; sales: number; revenue: number }>> {
  const { data: orders, error } = await getAllOrders();
  
  if (error || !orders) {
    return [];
  }

  // Filter only delivered orders
  const deliveredOrders = orders.filter((order: Order) => order.status === 'delivered');

  const productStats: { [productId: string]: { sales: number; revenue: number } } = {};

  deliveredOrders.forEach((order: Order) => {
    if (order.items) {
      order.items.forEach((item) => {
        if (!productStats[item.product_id]) {
          productStats[item.product_id] = { sales: 0, revenue: 0 };
        }
        productStats[item.product_id].sales += item.quantity;
        productStats[item.product_id].revenue += item.price * item.quantity;
      });
    }
  });

  return Object.entries(productStats)
    .map(([productId, stats]) => ({
      productId,
      sales: stats.sales,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

