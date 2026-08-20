import { supabase } from '../lib/supabase';

/*
  Checkout handles the actual sale.

  Important:
  orders.user_id = integer / customer user ID
  orders.sold_by = UUID / currently logged-in staff auth user
*/

export async function processCheckout({
  user,
  cart,
  paymentMethod,
  transactionId,
  customer,
  deliveryAddress,
  city,
  deliveryFee,
  notes,
}) {
  if (!user?.id) {
    throw new Error(
      'Your session has expired. Please log in again.'
    );
  }

  if (!cart || cart.length === 0) {
    throw new Error('Your cart is empty.');
  }

  const numericDeliveryFee = Number(deliveryFee || 0);

  if (
    Number.isNaN(numericDeliveryFee) ||
    numericDeliveryFee < 0
  ) {
    throw new Error('Delivery fee is invalid.');
  }

  /*
   * ---------------------------------------------------------
   * 1. VERIFY STOCK
   * ---------------------------------------------------------
   */

  const productIds = cart.map(
    (item) => item.product.id
  );

  const {
    data: currentProducts,
    error: stockError,
  } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      stock_quantity
    `)
    .in('id', productIds);

  if (stockError) {
    throw new Error(
      `Unable to verify stock: ${stockError.message}`
    );
  }

  for (const item of cart) {
    const currentProduct =
      currentProducts?.find(
        (product) =>
          product.id === item.product.id
      );

    if (!currentProduct) {
      throw new Error(
        `${item.product.name} could not be found.`
      );
    }

    const availableStock = Number(
      currentProduct.stock_quantity || 0
    );

    if (availableStock < item.quantity) {
      throw new Error(
        `Not enough stock for ${currentProduct.name}. Available: ${availableStock}.`
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * 2. CALCULATE TOTAL
   * ---------------------------------------------------------
   */

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.product.price || 0) *
        Number(item.quantity || 0),
    0
  );

  const total =
    subtotal + numericDeliveryFee;

  /*
   * ---------------------------------------------------------
   * 3. FIND CUSTOMER USER ID
   *
   * orders.user_id is INTEGER.
   *
   * We only use this when the customer email exists
   * in your users table.
   * ---------------------------------------------------------
   */

  let customerUserId = null;

  const customerEmail =
    (customer?.email || '').trim();

  if (customerEmail) {
    const {
      data: existingUser,
      error: customerLookupError,
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();

    if (customerLookupError) {
      console.warn(
        'Customer lookup failed:',
        customerLookupError.message
      );
    }

    if (existingUser) {
      customerUserId = existingUser.id;
    }
  }

  /*
   * ---------------------------------------------------------
   * 4. CREATE ORDER
   * ---------------------------------------------------------
   */

  const { data: order, error: orderError } =
    await supabase
      .from('orders')
      .insert({
        /*
         * INTEGER customer ID.
         *
         * DO NOT use user.id here.
         */
        user_id: customerUserId,

        order_date:
          new Date().toISOString(),

        total_amount: total,

        status: 'delivered',

        payment_status: 'paid',

        payment_method:
          paymentMethod,

        transaction_id:
          transactionId?.trim() || null,

        notes:
          notes?.trim() || null,

        first_name:
          customer?.first_name?.trim() || null,

        last_name:
          customer?.last_name?.trim() || null,

        phone:
          customer?.phone?.trim() || null,

        email:
          customer?.email?.trim() || null,

        delivery_address:
          deliveryAddress?.trim() || null,

        city:
          city?.trim() || null,

        delivery_fee:
          numericDeliveryFee,

        sales_channel: 'physical',

        /*
         * UUID of logged-in staff member.
         *
         * This matches your RLS policy:
         *
         * sold_by = auth.uid()
         */
        sold_by: user.id,
      })
      .select()
      .single();

  if (orderError) {
    throw new Error(
      `Unable to create order: ${orderError.message}`
    );
  }

  /*
   * ---------------------------------------------------------
   * 5. CREATE ORDER ITEMS
   * ---------------------------------------------------------
   */

  const orderItems = cart.map(
    (item) => ({
      order_id: order.id,

      product_id:
        item.product.id,

      quantity:
        item.quantity,

      price_at_purchase:
        Number(item.product.price || 0),
    })
  );

  const {
    error: orderItemsError,
  } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (orderItemsError) {
    throw new Error(
      `Order was created but order items could not be saved: ${orderItemsError.message}`
    );
  }

  /*
   * ---------------------------------------------------------
   * 6. RECORD PAYMENT
   * ---------------------------------------------------------
   */

  const {
    error: paymentError,
  } = await supabase
    .from('payments')
    .insert({
      order_id:
        order.id,

      amount:
        total,

      payment_method:
        paymentMethod,

      transaction_id:
        transactionId?.trim() || null,

      status:
        'completed',
    });

  if (paymentError) {
    throw new Error(
      `Order was created but payment could not be recorded: ${paymentError.message}`
    );
  }

  /*
   * ---------------------------------------------------------
   * 7. UPDATE STOCK
   * ---------------------------------------------------------
   */

  for (const item of cart) {
    const currentProduct =
      currentProducts.find(
        (product) =>
          product.id === item.product.id
      );

    const currentStock =
      Number(
        currentProduct.stock_quantity || 0
      );

    const newStock =
      currentStock - item.quantity;

    const {
      error: updateError,
    } = await supabase
      .from('products')
      .update({
        stock_quantity:
          newStock,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        item.product.id
      );

    if (updateError) {
      throw new Error(
        `Stock could not be updated for ${item.product.name}: ${updateError.message}`
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * 8. RECORD INVENTORY MOVEMENTS
   * ---------------------------------------------------------
   */

  const movements =
    cart.map(
      (item) => ({
        product_id:
          item.product.id,

        quantity:
          item.quantity,

        movement_type:
          'sale',

        reference_type:
          'ORDER',

        reference_id:
          order.id,

        notes:
          `POS sale - Order #${order.id}`,

        created_by:
          user.id,
      })
    );

  const {
    error: movementError,
  } = await supabase
    .from('inventory_movements')
    .insert(movements);

  if (movementError) {
    throw new Error(
      `Sale was completed but inventory movement could not be recorded: ${movementError.message}`
    );
  }

  /*
   * ---------------------------------------------------------
   * 9. RETURN ORDER
   * ---------------------------------------------------------
   */

  return {
    order,
    subtotal,
    total,
  };
}