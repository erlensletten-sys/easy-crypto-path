-- Add images array column to products table for multiple product images
ALTER TABLE public.products 
ADD COLUMN images text[] DEFAULT '{}';

-- Update existing products with sample images based on their category
UPDATE public.products 
SET images = ARRAY[image_url, image_url, image_url]
WHERE image_url IS NOT NULL;