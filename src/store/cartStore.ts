import { create } from 'zustand';

export interface CartItem {
  dishId: string;
  name: string;
  price: number;
  taxRate: number;
  quantity: number;
  notes?: string;
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

interface CartState {
  items: CartItem[];
  discount: number;
  discountType: 'FLAT' | 'PERCENT';
  tableId: string | null;
  tableName: string | null;
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  updateNotes: (dishId: string, notes: string) => void;
  setDiscount: (amount: number, type: 'FLAT' | 'PERCENT') => void;
  setOrderType: (type: OrderType) => void;
  setTable: (tableId: string | null, tableName: string | null) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  clearCart: () => void;
  loadCart: (order: any) => void; // for resuming a held order
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  discount: 0,
  discountType: 'FLAT',
  tableId: null,
  tableName: null,
  orderType: 'TAKEAWAY',
  customerName: '',
  customerPhone: '',

  addItem: (item, quantity = 1) => set((state) => {
    const existing = state.items.find((i) => i.dishId === item.dishId);
    if (existing) {
      return {
        items: state.items.map((i) =>
          i.dishId === item.dishId ? { ...i, quantity: i.quantity + quantity } : i
        ),
      };
    }
    return { items: [...state.items, { ...item, quantity }] };
  }),

  removeItem: (dishId) => set((state) => ({
    items: state.items.filter((i) => i.dishId !== dishId),
  })),

  updateQuantity: (dishId, quantity) => set((state) => ({
    items: state.items.map((i) =>
      i.dishId === dishId ? { ...i, quantity: Math.max(1, quantity) } : i
    ),
  })),

  updateNotes: (dishId, notes) => set((state) => ({
    items: state.items.map((i) =>
      i.dishId === dishId ? { ...i, notes } : i
    ),
  })),

  setDiscount: (discount, discountType) => set({ discount, discountType }),

  setOrderType: (orderType) => set((state) => ({
    orderType,
    // Reset table configuration if not Dine-In
    tableId: orderType === 'DINE_IN' ? state.tableId : null,
    tableName: orderType === 'DINE_IN' ? state.tableName : null,
  })),

  setTable: (tableId, tableName) => set({ tableId, tableName }),

  setCustomerInfo: (customerName, customerPhone) => set({ customerName, customerPhone }),

  clearCart: () => set({
    items: [],
    discount: 0,
    discountType: 'FLAT',
    tableId: null,
    tableName: null,
    orderType: 'DINE_IN',
    customerName: '',
    customerPhone: '',
  }),

  loadCart: (order) => set({
    items: order.items.map((item: any) => ({
      dishId: item.dishId,
      name: item.dish.name,
      price: Number(item.price),
      taxRate: Number(item.taxRate),
      quantity: item.quantity,
      notes: item.notes || '',
    })),
    discount: Number(order.discountTotal),
    discountType: 'FLAT',
    tableId: order.tableId || null,
    tableName: order.table?.number || null,
    orderType: order.type as OrderType,
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
  }),
}));
