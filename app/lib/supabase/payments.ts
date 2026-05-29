import { supabase } from "./client";

export interface PaymentItem {
  product_id: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export type PaymentStatus = 'pending' | 'validated' | 'cancelled';
export type PaymentMethod = 'wave' | 'orange' | 'mtn' | 'moov';

export interface Payment {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  payment_phone: string;
  payment_method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  items: PaymentItem[];
  shipping_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  user_id: string;
  customer_name: string;
  customer_phone: string;
  payment_phone: string;
  payment_method: PaymentMethod;
  amount: number;
  items: PaymentItem[];
  shipping_address?: string;
  notes?: string;
}

async function decrementStock(items: PaymentItem[]): Promise<string | null> {
  for (const item of items) {
    let retries = 5;
    let success = false;

    while (retries > 0 && !success) {
      const { data: product, error: fetchErr } = await supabase
        .from('zo-products')
        .select('sizes, title, updated_at')
        .eq('id', item.product_id)
        .single();

      if (fetchErr || !product) return 'Erreur lors de la vérification du stock';

      const sizes = product.sizes as Record<string, number>;
      const available = sizes[item.size] || 0;
      const productTitle = product.title || 'Ce produit';

      if (available < item.quantity) {
        return available === 0
          ? `${productTitle} (taille ${item.size}) n'est plus disponible en stock.`
          : `${productTitle} (taille ${item.size}) n'a plus que ${available} article(s) disponible(s).`;
      }

      const updatedSizes = { ...sizes, [item.size]: available - item.quantity };
      const totalQty = Object.values(updatedSizes).reduce((s, q) => s + q, 0);

      const { data: updated, error: updateErr } = await supabase
        .from('zo-products')
        .update({ sizes: updatedSizes, in_stock: totalQty > 0, updated_at: new Date().toISOString() })
        .eq('id', item.product_id)
        .eq('updated_at', product.updated_at)
        .select('id');

      if (updateErr || !updated || updated.length === 0) {
        retries--;
        await new Promise((r) => setTimeout(r, 50 * (6 - retries)));
        continue;
      }

      success = true;
    }

    if (!success) return 'Stock indisponible. Veuillez réessayer.';
  }
  return null;
}

async function restoreStock(items: PaymentItem[]): Promise<void> {
  for (const item of items) {
    if (!item.product_id) continue;
    try {
      const { data: product } = await supabase
        .from('zo-products')
        .select('sizes')
        .eq('id', item.product_id)
        .single();

      if (!product?.sizes) continue;

      const sizes = product.sizes as Record<string, number>;
      const updatedSizes = { ...sizes, [item.size]: (sizes[item.size] || 0) + item.quantity };
      const totalQty = Object.values(updatedSizes).reduce((s, q) => s + q, 0);

      await supabase
        .from('zo-products')
        .update({ sizes: updatedSizes, in_stock: totalQty > 0, updated_at: new Date().toISOString() })
        .eq('id', item.product_id);
    } catch (err) {
      console.error(`Failed to restore stock for product ${item.product_id}:`, err);
    }
  }
}

async function createOrderFromPayment(payment: Payment): Promise<void> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('zo-orders')
      .insert({
        user_id: payment.user_id,
        total_amount: payment.amount,
        status: 'confirmed',
        shipping_address: payment.shipping_address,
        shipping_phone: payment.customer_phone,
        pickup_number: '',
        customer_name: payment.customer_name,
        customer_phone: payment.customer_phone,
        notes: payment.notes
          ? `[Paiement ${payment.payment_method}] ${payment.notes}`
          : `[Paiement ${payment.payment_method}]`,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Failed to create order from payment:', orderError);
      return;
    }

    const orderItems = payment.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      title: item.title,
      price: item.price,
      image_url: item.image_url || '',
      size: item.size,
      color: item.color || null,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase.from('zo-order-items').insert(orderItems);

    if (itemsError) {
      console.error('Failed to create order items from payment:', itemsError);
      await supabase.from('zo-orders').delete().eq('id', order.id);
    }
  } catch (err) {
    console.error('Error creating order from payment:', err);
  }
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<{ data: Payment | null; error: string | null }> {
  try {
    const stockError = await decrementStock(input.items);
    if (stockError) return { data: null, error: stockError };

    const { data, error } = await supabase
      .from('zo-payments')
      .insert({
        user_id: input.user_id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        payment_phone: input.payment_phone,
        payment_method: input.payment_method,
        amount: input.amount,
        status: 'pending',
        items: input.items,
        shipping_address: input.shipping_address,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) {
      await restoreStock(input.items);
      return { data: null, error: error.message };
    }

    return { data: data as Payment, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown error' };
  }
}

export async function getUserPayments(
  userId: string
): Promise<{ data: Payment[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as Payment[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown error' };
  }
}

export async function getAllPayments(): Promise<{
  data: Payment[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('zo-payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as Payment[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown error' };
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus
): Promise<{ data: Payment | null; error: string | null }> {
  try {
    const { data: current, error: fetchErr } = await supabase
      .from('zo-payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchErr || !current) return { data: null, error: 'Paiement introuvable' };

    // Restore stock when cancelling a non-cancelled payment
    if (status === 'cancelled' && current.status !== 'cancelled') {
      await restoreStock(current.items as PaymentItem[]);
    }

    // Re-decrement stock when reactivating a cancelled payment
    if (status !== 'cancelled' && current.status === 'cancelled') {
      const stockError = await decrementStock(current.items as PaymentItem[]);
      if (stockError) return { data: null, error: stockError };
    }

    // Create order in zo-orders only when first validated
    if (status === 'validated' && current.status !== 'validated') {
      await createOrderFromPayment(current as Payment);
    }

    const { data, error } = await supabase
      .from('zo-payments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Payment, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown error' };
  }
}
