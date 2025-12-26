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
  notes?: string;
}

/**
 * Create a new order with order items
 */
export async function createOrder(input: CreateOrderInput): Promise<{ data: Order | null; error: string | null }> {
  try {
    // Calculate total amount
    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('zo-orders')
      .insert({
        user_id: input.user_id,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address: input.shipping_address,
        shipping_phone: input.shipping_phone,
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
        await sendNewOrderNotification(order.id, totalAmount, clientName, clientPhone);
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
        fetch('/api/email', {
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
        }).catch((emailError) => {
          console.error('Failed to send email notification (non-blocking):', emailError);
        });
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
      .order('created_at', { ascending: false });

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
      .order('created_at', { ascending: false });

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

