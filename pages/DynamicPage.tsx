
import React from 'react';
import type { CustomPage } from '../types';
import SEOHead from '../components/SEOHead';

interface DynamicPageProps {
  page: CustomPage;
}

const DynamicPage: React.FC<DynamicPageProps> = ({ page }) => {
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\n)/).map(part => part.trim());
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-4 text-muted-foreground dark:text-dark-muted-foreground">
                    {listItems.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            );
            listItems = [];
        }
    };

    parts.forEach((line, index) => {
        if (line.startsWith('# ')) {
            elements.push(<h1 key={index} className="text-3xl md:text-4xl font-bold font-display text-foreground dark:text-dark-foreground mb-6 mt-8">{line.substring(2)}</h1>);
        } else if (line.startsWith('## ')) {
            elements.push(<h2 key={index} className="text-2xl font-bold font-display text-foreground dark:text-dark-foreground mt-8 mb-4">{line.substring(3)}</h2>);
        } else if (line.startsWith('### ')) {
            elements.push(<h3 key={index} className="text-xl font-semibold text-foreground dark:text-dark-foreground mt-6 mb-3">{line.substring(4)}</h3>);
        } else if (line.startsWith('* ')) {
            listItems.push(line.substring(2));
        } else if (line) {
            flushList();
            elements.push(<p key={index} className="text-lg text-muted-foreground dark:text-dark-muted-foreground leading-relaxed mb-4">{line}</p>);
        }
    });

    flushList();
    return elements;
  };

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      <SEOHead 
        title={page.seo?.title || `${page.title} | Revrom.in`} 
        description={page.seo?.description} 
        keywords={page.seo?.keywords}
        image={page.seo?.ogImage || page.imageUrl}
      />
      
      {page.imageUrl ? (
         <div className="relative h-64 md:h-80 bg-cover bg-center" style={{ backgroundImage: `url(${page.imageUrl})` }}>
            <div className="absolute inset-0 bg-black/50"></div>
            <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-center relative z-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display text-center">{page.title}</h1>
            </div>
        </div>
      ) : (
        <div className="bg-card dark:bg-dark-card border-b border-border dark:border-dark-border py-16">
             <div className="container mx-auto px-4 sm:px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-foreground dark:text-dark-foreground font-display">{page.title}</h1>
             </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-4xl">
         <div className="bg-card dark:bg-dark-card p-6 md:p-10 rounded-lg shadow-sm border border-border dark:border-dark-border">
             {renderMarkdown(page.content)}
         </div>
      </div>
    </div>
  );
};

export default DynamicPage;
