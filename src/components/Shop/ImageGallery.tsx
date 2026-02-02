import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/placeholder.svg';
  };

  return (
    <div className="space-y-4">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        <img
          src={images[selectedIndex] || '/placeholder.svg'}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
      
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors',
                selectedIndex === index
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/50'
              )}
            >
              <img
                src={image || '/placeholder.svg'}
                alt={`${productName} - Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
