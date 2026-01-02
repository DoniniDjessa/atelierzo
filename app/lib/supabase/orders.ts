import { supabase } from './client';
import { sendNewOrderNotification } from '@/app/lib/sms/service';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  title: string;
  price: number;
  image_url: string;
  size: string;
  color?: string;
  quantity: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address?: string;
  shipping_phone?: string;
  pickup_number?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface CreateOrderInput {
  user_id: string;
  items: Array<{
    product_id: string;
    title: string;
    price: number;
    image_url: string;
    size: string;
    color?: string;
    quantity: number;
  }>;
  shipping_address?: string;
  shipping_phone?: string;
  pickup_number: string;
  notes?: string;
}

/**
 * Create a new order with order items
 */
export async function createOrder(input: CreateOrderInput): Promise<{ data: Order | null; error: string | null }> {
  try {
    // Calculate total amount
    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Check for duplicate orders within the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const { data: recentOrders, error: checkError } = await supabase
      .from('zo-orders')
      .select('id, created_at, total_amount')
      .eq('user_id', input.user_id)
      .eq('total_amount', totalAmount)
      .eq('shipping_phone', input.shipping_phone || '')
      .gte('created_at', tenSecondsAgo)
      .limit(1);

    if (checkError) {
      console.error('Error checking for duplicate orders:', checkError);
    } else if (recentOrders && recentOrders.length > 0) {
      console.warn('Duplicate order attempt detected within 10 seconds');
      return { data: null, error: 'Une commande identique a déjà été créée. Veuillez patienter.' };
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('zo-orders')
      .insert({
        user_id: input.user_id,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address: input.shipping_address,
        shipping_phone: input.shipping_phone,
        pickup_number: input.pickup_number,
        notes: input.notes,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return { data: null, error: orderError?.message || 'Failed to create order' };
    }

    // Create order items
    const orderItems = input.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      title: item.title,
      price: item.price,
      image_url: item.image_url,
      size: item.size,
      color: item.color || null,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase.from('zo-order-items').insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order creation
      await supabase.from('zo-orders').delete().eq('id', order.id);
      return { data: null, error: itemsError.message };
    }

    // Decrease product quantities for each order item
    for (const item of input.items) {
      try {
        // Use a retry mechanism to handle race conditions
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          // Get current product with updated_at for optimistic locking
          const { data: product, error: productError } = await supabase
            .from('zo-products')
            .select('sizes, updated_at')
            .eq('id', item.product_id)
            .single();

          if (productError || !product) {
            console.error(`Error fetching product ${item.product_id}:`, productError);
            break; // Skip this product
          }

          // Update sizes with decreased quantities
          if (product.sizes && typeof product.sizes === 'object' && !Array.isArray(product.sizes)) {
            const sizes = product.sizes as Record<string, number>;
            const currentQty = sizes[item.size] || 0;
            const newQty = Math.max(0, currentQty - item.quantity); // Ensure quantity doesn't go below 0
            
            const updatedSizes = {
              ...sizes,
              [item.size]: newQty,
            };

            // Calculate total quantity to determine if product is in stock
            const totalQuantity = Object.values(updatedSizes).reduce((sum, qty) => sum + qty, 0);

            // Update product with new quantities and stock status
            // Use updated_at for optimistic locking
            const { error: updateError } = await supabase
              .from('zo-products')
              .update({
                sizes: updatedSizes,
                in_stock: totalQuantity > 0,
              })
              .eq('id', item.product_id)
              .eq('updated_at', product.updated_at); // Optimistic locking
            
            if (updateError) {
              console.error(`Error updating product ${item.product_id}:`, updateError);
              retries--;
              if (retries > 0) {
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
              }
            } else {
              success = true;
            }
          } else {
            break;
          }
        }
      } catch (error) {
        console.error(`Error updating product ${item.product_id} quantity:`, error);
        // Continue with other products even if one fails
      }
    }

    // Fetch order with items
    const { data: orderWithItems, error: fetchError } = await supabase
      .from('zo-orders')
      .select('*, items:zo-order-items(*)')
      .eq('id', order.id)
      .single();

    if (fetchError) {
      console.error('Error fetching order with items:', fetchError);
      return { data: order, error: null }; // Return order without items if fetch fails
    }

    // Send SMS and Email notifications to admin (non-blocking)
    try {
      // Get user info once for both SMS and email
      const { data: userData } = await supabase.from('zo-users').select('name, phone').eq('id', input.user_id).single();
      const clientName = userData?.name || input.shipping_phone || 'Client';
      const clientPhone = userData?.phone || input.shipping_phone || 'N/A';
      const deliveryAddress = input.shipping_address || 'Non spécifiée';
      
      // Send SMS notification
      try {
        const smsResult = await sendNewOrderNotification(order.id, totalAmount, clientName, clientPhone);
        if (smsResult?.error) {
          console.error('SMS notification error:', smsResult.error);
        } else {
          console.log('SMS notification sent successfully');
        }
      } catch (smsError) {
        console.error('Failed to send SMS notification (non-blocking):', smsError);
      }
      
      // Send Email notification via API route
      try {
        // Prepare items for email
        const emailItems = input.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price * item.quantity,
          size: item.size,
          color: item.color,
        }));
        
        // Call API route to send email (non-blocking)
        const emailResponse = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'order_notification',
            orderId: order.id,
            totalAmount,
            clientName,
            clientPhone,
            deliveryAddress,
            items: emailItems,
          }),
        });
        
        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error('Email notification error:', errorData.error || `HTTP ${emailResponse.status}`);
        } else {
          console.log('Email notification sent successfully');
        }
      } catch (emailError) {
        console.error('Failed to send email notification (non-blocking):', emailError);
      }
    } catch (notificationError) {
      console.error('Failed to send notifications (non-blocking):', notificationError);
    }

    return { data: orderWithItems as unknown as Order, error: null };
  } catch (error: any) {
    console.error('Unexpected error creating order:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all orders for a user
 */
export async function getUserOrders(userId: string): Promise<{ data: Order[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-orders')
      .select('*, items:zo-order-items(*)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user orders:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Order[], error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching user orders:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all orders (admin)
 */
export async function getAllOrders(): Promise<{ data: Order[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-orders')
      .select('*, items:zo-order-items(*)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all orders:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Order[], error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching all orders:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get paginated orders (admin)
 */
export async function getPaginatedOrders(
  page: number = 1,
  itemsPerPage: number = 13,
  filters?: {
    statusFilter?: Order['status'] | 'all' | 'active';
    searchQuery?: string;
    dateFilterType?: 'all' | 'day' | 'range';
    selectedDate?: string;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    amountSort?: 'none' | 'high-to-low' | 'low-to-high';
  }
): Promise<{ data: Order[] | null; total: number; error: string | null }> {
  try {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Build base query
    let countQuery = supabase
      .from('zo-orders')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    let dataQuery = supabase
      .from('zo-orders')
      .select('*, items:zo-order-items(*)')
      .eq('is_deleted', false);

    // Apply status filter
    if (filters?.statusFilter && filters.statusFilter !== 'all') {
      if (filters.statusFilter === 'active') {
        // Active means not delivered and not cancelled
        countQuery = countQuery.neq('status', 'delivered').neq('status', 'cancelled');
        dataQuery = dataQuery.neq('status', 'delivered').neq('status', 'cancelled');
      } else {
        countQuery = countQuery.eq('status', filters.statusFilter);
        dataQuery = dataQuery.eq('status', filters.statusFilter);
      }
    }

    // Apply date filters
    if (filters?.dateFilterType === 'day' && filters.selectedDate) {
      const startOfDay = new Date(filters.selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      countQuery = countQuery.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      dataQuery = dataQuery.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
    } else if (filters?.dateFilterType === 'range' && filters.dateRangeStart && filters.dateRangeEnd) {
      const startDate = new Date(filters.dateRangeStart);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      countQuery = countQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      dataQuery = dataQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
    }

    // Apply search filter (basic - only ID and phone for now, as addresses require joining)
    if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
      const search = filters.searchQuery.toLowerCase();
      // Note: We need to fetch all data first and filter client-side for product names
      // since they are in a related table. For now, filter by order fields only.
      // Client-side filtering will handle product names after fetching.
      dataQuery = dataQuery.or(`shipping_phone.ilike.%${search}%,shipping_address.ilike.%${search}%,id.ilike.%${search}%,pickup_number.ilike.%${search}%`);
      countQuery = countQuery.or(`shipping_phone.ilike.%${search}%,shipping_address.ilike.%${search}%,id.ilike.%${search}%,pickup_number.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await countQuery;

    // Apply sorting
    if (filters?.amountSort === 'high-to-low') {
      dataQuery = dataQuery.order('total_amount', { ascending: false });
    } else if (filters?.amountSort === 'low-to-high') {
      dataQuery = dataQuery.order('total_amount', { ascending: true });
    } else {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    // Apply pagination
    dataQuery = dataQuery.range(from, to);

    // Execute query
    const { data, error } = await dataQuery;

    if (error) {
      console.error('Error fetching paginated orders:', error);
      return { data: null, total: 0, error: error.message };
    }

    return { data: data as unknown as Order[], total: count || 0, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching paginated orders:', error);
    return { data: null, total: 0, error: error.message || 'Unknown error' };
  }
}

/**
 * Get count of orders by status with optional filters
 */
export async function getOrdersCountByStatus(filters?: {
  searchQuery?: string;
  dateFilterType?: 'all' | 'day' | 'range';
  selectedDate?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}): Promise<{ data: Record<string, number> | null; error: string | null }> {
  try {
    const statuses: Order['status'][] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      let query = supabase
        .from('zo-orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('status', status);

      // Apply date filters
      if (filters?.dateFilterType === 'day' && filters.selectedDate) {
        const startOfDay = new Date(filters.selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      } else if (filters?.dateFilterType === 'range' && filters.dateRangeStart && filters.dateRangeEnd) {
        const startDate = new Date(filters.dateRangeStart);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filters.dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
      }

      // Apply search filter
      if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
        const search = filters.searchQuery.toLowerCase();
        query = query.or(`shipping_phone.ilike.%${search}%,shipping_address.ilike.%${search}%,id.ilike.%${search}%`);
      }
      // For now, we'll only apply date filters to counts for performance

      const { count, error } = await query;

      if (error) {
        console.error(`Error fetching count for status ${status}:`, error);
        counts[status] = 0;
      } else {
        counts[status] = count || 0;
      }
    }

    return { data: counts, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching order counts by status:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get orders for a specific client (user)
 */
export async function getClientOrders(clientId: string): Promise<{ data: Order[] | null; error: string | null }> {
  return getUserOrders(clientId);
}

/**
 * Get a single order by ID
 */
export async function getOrderById(
  orderId: string,
  includeItems: boolean = true
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const query = includeItems
      ? supabase
          .from('zo-orders')
          .select('*, items:zo-order-items(*)')
          .eq('id', orderId)
          .single()
      : supabase.from('zo-orders').select('*').eq('id', orderId).single();

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching order by ID:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Order, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching order by ID:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<{ data: Order | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order status:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Order, error: null };
  } catch (error: any) {
    console.error('Unexpected error updating order status:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete an order
 */
/**
 * Delete an order (soft delete by setting is_deleted = true)
 */
export async function deleteOrder(orderId: string): Promise<{ error: string | null }> {
  try {
    // Soft delete: mark as deleted instead of actually deleting
    const { error } = await supabase
      .from('zo-orders')
      .update({ is_deleted: true })
      .eq('id', orderId);

    if (error) {
      console.error('Error deleting order:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting order:', error);
    return { error: error.message || 'Unknown error' };
  }
}

/**
 * Delete duplicate order without restoring inventory
 * Use this for duplicate orders that were created due to bugs
 */
export async function deleteDuplicateOrder(orderId: string): Promise<{ error: string | null }> {
  try {
    // Just soft delete without any inventory restoration
    const { error } = await supabase
      .from('zo-orders')
      .update({ 
        is_deleted: true,
        status: 'cancelled' // Mark as cancelled too
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error deleting duplicate order:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting duplicate order:', error);
    return { error: error.message || 'Unknown error' };
  }
}
