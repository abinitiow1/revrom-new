
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlogPost } from '../types';
import SEOHead from '../components/SEOHead';

interface BlogDetailPageProps {
  post: BlogPost;
  onBack: () => void;
}

const CalendarIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1zm0 5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H6z" clipRule="evenodd" />
    </svg>
);

const UserIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z" clipRule="evenodd" />
    </svg>
);

const BlogDetailPage: React.FC<BlogDetailPageProps> = ({ post, onBack }) => {
  
  return (
    <div className="bg-background dark:bg-dark-background">
      <SEOHead 
        title={post.seo?.title || `${post.title} | Revrom.in`} 
        description={post.seo?.description || post.excerpt} 
        keywords={post.seo?.keywords}
        image={post.seo?.ogImage || post.imageUrl}
        type="article"
      />

      <div className="relative h-72 sm:h-96 bg-cover bg-center" style={{ backgroundImage: `url(${post.imageUrl})` }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="container mx-auto px-4 sm:px-6 h-full flex flex-col justify-end pb-8 md:pb-12 relative z-10">
           <button onClick={onBack} className="absolute top-4 left-4 sm:top-8 sm:left-6 text-white bg-black/30 hover:bg-black/50 px-3 py-1 rounded-md text-sm transition-colors z-20">&larr; Back to Blog</button>
           <h1 className="text-3xl md:text-5xl font-extrabold text-white font-display">{post.title}</h1>
           <div className="flex flex-col sm:flex-row items-start sm:items-center text-sm text-gray-200 mt-4 gap-2 sm:gap-0">
                <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>By {post.author}</span>
                </div>
                <span className="hidden sm:block mx-3">|</span>
                <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
           </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-4xl">
        <div className="prose lg:prose-xl max-w-none prose-slate dark:prose-invert text-muted-foreground dark:text-dark-muted-foreground leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
