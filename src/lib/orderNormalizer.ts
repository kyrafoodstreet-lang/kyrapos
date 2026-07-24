/**
 * Kyra POS Order Normalization Utility
 * Guarantees safe, non-null, fully typed data structures for POS components,
 * receipt rendering, and background print agent dispatchers.
 */

export interface NormalizedItem {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  quantity: number;
  taxRate: number;
  amount: number;
  notes?: string;
}

export interface NormalizedOrder {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  createdAt: string;
  items: NormalizedItem[];
  customerName: string;
  customerPhone: string;
  tableName: string | null;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  cashierName: string;
  paymentMethod: string;
}

export function normalizeOrder(
  rawOrder: any,
  fallbackCartItems: any[] = [],
  fallbackMeta: {
    user?: any;
    paymentMethod?: string;
    subtotal?: number;
    taxTotal?: number;
    discountTotal?: number;
    grandTotal?: number;
  } = {}
): NormalizedOrder {
  const safeObj = rawOrder && typeof rawOrder === 'object' ? rawOrder : {};

  // Normalize items array
  let rawItems: any[] = [];
  if (Array.isArray(safeObj.items) && safeObj.items.length > 0) {
    rawItems = safeObj.items;
  } else if (Array.isArray(fallbackCartItems) && fallbackCartItems.length > 0) {
    rawItems = fallbackCartItems;
  }

  const items: NormalizedItem[] = rawItems.map((item: any, idx: number) => {
    const itemObj = item && typeof item === 'object' ? item : {};
    const dishObj = itemObj.dish && typeof itemObj.dish === 'object' ? itemObj.dish : {};
    const catObj = dishObj.category && typeof dishObj.category === 'object' ? dishObj.category : {};

    const name = itemObj.name || dishObj.name || 'Menu Item';
    const categoryName = catObj.name || 'General';
    const price = Math.max(0, Number(itemObj.price || dishObj.price || 0));
    const quantity = Math.max(1, Number(itemObj.quantity || 1));
    const taxRate = Math.max(0, Number(itemObj.taxRate || dishObj.taxRate || 0));
    const amount = price * quantity;
    const notes = itemObj.notes || undefined;
    const id = String(itemObj.id || itemObj.dishId || `item_${idx}`);

    return {
      id,
      name,
      categoryName,
      price,
      quantity,
      taxRate,
      amount,
      notes,
    };
  });

  // Calculate safe totals if missing
  const computedSubtotal = items.reduce((acc, i) => acc + i.amount, 0);
  const computedTaxTotal = items.reduce((acc, i) => acc + (i.amount * (i.taxRate / 100)), 0);

  const subtotal = Math.max(0, Number(safeObj.subtotal ?? fallbackMeta.subtotal ?? computedSubtotal));
  const taxTotal = Math.max(0, Number(safeObj.taxTotal ?? fallbackMeta.taxTotal ?? computedTaxTotal));
  const discountTotal = Math.max(0, Number(safeObj.discountTotal ?? fallbackMeta.discountTotal ?? 0));
  const grandTotal = Math.max(0, Number(safeObj.grandTotal ?? fallbackMeta.grandTotal ?? Math.max(0, subtotal + taxTotal - discountTotal)));

  // Cashier name normalization
  const cashierObj = safeObj.cashier && typeof safeObj.cashier === 'object' ? safeObj.cashier : {};
  const cashierName = String(cashierObj.name || safeObj.cashierName || fallbackMeta.user?.name || 'Cashier');

  // Customer normalization
  const customerName = String(safeObj.customerName || 'Walk-in Customer');
  const customerPhone = String(safeObj.customerPhone || '');

  // Table normalization
  const tableObj = safeObj.table && typeof safeObj.table === 'object' ? safeObj.table : {};
  const tableName = tableObj.number || safeObj.tableName || null;

  const orderNumber = String(safeObj.orderNumber || safeObj.id || Math.floor(1000 + Math.random() * 9000));
  const id = String(safeObj.id || `ord_${Date.now()}`);
  const type = String(safeObj.type || 'TAKEAWAY');
  const status = String(safeObj.status || 'COMPLETED');
  const createdAt = String(safeObj.createdAt || new Date().toISOString());
  const paymentMethod = String(fallbackMeta.paymentMethod || safeObj.paymentMethod || 'CASH');

  return {
    id,
    orderNumber,
    type,
    status,
    createdAt,
    items,
    customerName,
    customerPhone,
    tableName,
    subtotal,
    taxTotal,
    discountTotal,
    grandTotal,
    cashierName,
    paymentMethod,
  };
}
