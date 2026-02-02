-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Products: Anyone can view, only authenticated users can read (for now, admin can be added later)
CREATE POLICY "Products are viewable by everyone" 
ON public.products FOR SELECT 
USING (true);

-- Cart items: Users can only access their own cart
CREATE POLICY "Users can view their own cart items" 
ON public.cart_items FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart" 
ON public.cart_items FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" 
ON public.cart_items FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" 
ON public.cart_items FOR DELETE 
USING (auth.uid() = user_id);

-- Orders: Users can only access their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = user_id);

-- Order items: Users can view items from their own orders
CREATE POLICY "Users can view their own order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create order items for their orders" 
ON public.order_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample products
INSERT INTO public.products (name, description, price, image_url, category, stock) VALUES
('Bitcoin Hardware Wallet', 'Secure your crypto with this premium hardware wallet', 149.99, 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400', 'Hardware', 50),
('Ethereum Starter Kit', 'Everything you need to start with Ethereum', 79.99, 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400', 'Bundles', 100),
('Crypto Trading Guide', 'Comprehensive guide to cryptocurrency trading', 29.99, 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400', 'Education', 999),
('Mining Rig Setup', 'Professional mining equipment bundle', 2499.99, 'https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=400', 'Hardware', 10),
('NFT Creator Pro', 'Software for creating and minting NFTs', 199.99, 'https://images.unsplash.com/photo-1644143379190-08a5f055de1d?w=400', 'Software', 500),
('Blockchain Dev Course', 'Learn blockchain development from scratch', 149.99, 'https://images.unsplash.com/photo-1526378800651-c32d170fe6f8?w=400', 'Education', 999);