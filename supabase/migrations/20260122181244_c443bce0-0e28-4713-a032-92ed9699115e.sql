-- Add payment tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_id TEXT,
ADD COLUMN payment_status TEXT DEFAULT 'awaiting_payment',
ADD COLUMN pay_address TEXT,
ADD COLUMN pay_amount NUMERIC,
ADD COLUMN pay_currency TEXT;