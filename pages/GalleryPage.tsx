import React, { useState, useMemo } from 'react';
import type { GalleryPhoto } from '../types';

interface GalleryPageProps {
  photos: GalleryPhoto[];
}

const GalleryPage: React.FC<GalleryPageProps> = ({ photos }) => {
  const categories: ('All' | GalleryPhoto['category'])[] = ['All', 'Landscapes', 'Riders', 'Culture', 'Behind the Scenes'];
  const [activeFilter, setActiveFilter] = useState<'All' | GalleryPhoto['category']>('All');

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'All') {
      return photos;
    }
    return photos.filter(photo => photo.category === activeFilter);
  }, [activeFilter, photos]);

  return (
    <div className="bg-background dark:bg-dark-background">
      <div className="relative h-64 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/ladakh-gallery-hero/1920/1080')" }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display text-center">Moments From the Road</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="flex justify-center flex-wrap gap-2 md:gap-4 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 text-sm md:text-base font-semibold rounded-full transition-colors duration-300 ${
                activeFilter === category
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filteredPhotos.map(photo => (
            <div key={photo.id} className="break-inside-avoid relative group overflow-hidden rounded-lg shadow-md">
              <img src={photo.imageUrl} alt={photo.caption} className="w-full h-auto object-cover" loading="lazy" />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-end p-4">
                  <p className="text-white text-sm opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {photo.caption}
                  </p>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;