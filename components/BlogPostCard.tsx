import React from 'react';
import type { BlogPost } from '../types';

interface BlogPostCardProps {
  post: BlogPost;
  onSelectPost: (post: BlogPost) => void;
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

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, onSelectPost }) => {
  return (
    <div 
      className="bg-card dark:bg-dark-card rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 cursor-pointer group flex flex-col border border-border dark:border-dark-border hover:border-brand-primary"
      onClick={() => onSelectPost(post)}
    >
      <div className="relative">
        <img src={post.imageUrl} alt={post.title} className="w-full h-56 object-cover" loading="lazy" />
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center text-xs text-muted-foreground dark:text-dark-muted-foreground mb-3">
          <UserIcon className="w-4 h-4 mr-1 text-brand-accent-gold" />
          <span>{post.author}</span>
          <span className="mx-2">|</span>
          <CalendarIcon className="w-4 h-4 mr-1 text-brand-accent-gold" />
          <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <h3 className="text-xl font-bold font-display mb-2 text-foreground dark:text-dark-foreground group-hover:text-brand-primary transition-colors flex-grow">{post.title}</h3>
        <p className="text-muted-foreground dark:text-dark-muted-foreground text-sm mb-4">{post.excerpt}</p>
        <button className="mt-auto text-brand-primary font-semibold text-sm self-start group-hover:underline">
          Read More &rarr;
        </button>
      </div>
    </div>
  );
};

export default BlogPostCard;
