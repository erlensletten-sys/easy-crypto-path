-- Add admin SELECT policy for order_items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin SELECT policy for cart_items
CREATE POLICY "Admins can view all cart items"
ON public.cart_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));