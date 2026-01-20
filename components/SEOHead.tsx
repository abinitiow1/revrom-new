
import React, { useEffect } from 'react';
import type { SEOConfig } from '../types';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

const SEOHead: React.FC<SEOHeadProps> = ({ 
    title, 
    description, 
    keywords, 
    image, 
    url = window.location.href,
    type = 'website'
}) => {
  
  useEffect(() => {
    // Update Title
    if (title) {
        document.title = title;
    }

    // Helper to update or create meta tags
    const updateMeta = (name: string, content: string | undefined, attribute: 'name' | 'property' = 'name') => {
        if (!content) return;
        
        let element = document.querySelector(`meta[${attribute}="${name}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attribute, name);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    updateMeta('description', description);
    updateMeta('keywords', keywords);

    // Open Graph
    updateMeta('og:title', title, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:image', image, 'property');
    updateMeta('og:url', url, 'property');
    updateMeta('og:type', type, 'property');

    // Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', image);

    return () => {
        // Optional: Reset logic if needed, but usually SPA navigation handles overwrite
    };

  }, [title, description, keywords, image, url, type]);

  return null;
};

export default SEOHead;
