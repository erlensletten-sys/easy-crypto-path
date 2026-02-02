import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
  stock: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (product_id: number) => void;
  updateQuantity: (product_id: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.product_id === item.product_id);
      if (existingItem) {
        // Increase quantity if item exists
        return prevItems.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantity: Math.min(i.quantity + 1, item.stock) }
            : i
        );
      }
      // Add new item with quantity 1
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (product_id: number) => {
    setItems((prevItems) => prevItems.filter((i) => i.product_id !== product_id));
  };

  const updateQuantity = (product_id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(product_id);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((i) =>
        i.product_id === product_id
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
