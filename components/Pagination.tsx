import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const getPaginationItems = (currentPage: number, totalPages: number): (number | string)[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const delta = 1;
    const range: (number | string)[] = [];
    
    range.push(1);
    if (currentPage > delta + 2) {
        range.push("...");
    }
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
    }
    
    if (currentPage < totalPages - (delta + 1)) {
        range.push("...");
    }

    if (totalPages > 1) {
       range.push(totalPages);
    }
    
    return [...new Set(range)];
};

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getPaginationItems(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between border-t border-border dark:border-dark-border px-4 py-3 sm:px-6 -mx-6 -mb-6 rounded-b-lg mt-4 bg-card dark:bg-dark-card">
      <div className="flex flex-1 justify-between sm:justify-end items-center">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md bg-card dark:bg-dark-card px-3 py-2 text-sm font-semibold text-foreground dark:text-dark-foreground ring-1 ring-inset ring-border dark:ring-dark-border hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Previous
        </button>

        <nav className="hidden sm:flex items-center space-x-1 mx-4" aria-label="Pagination">
          {pages.map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={`${page}-${index}`}
                onClick={() => onPageChange(page)}
                className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md ${
                  currentPage === page
                    ? 'bg-brand-primary text-white'
                    : 'text-foreground dark:text-dark-foreground ring-1 ring-inset ring-border dark:ring-dark-border hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ) : (
              <span key={`${page}-${index}`} className="px-4 py-2 text-sm font-semibold text-muted-foreground dark:text-dark-muted-foreground">
                {page}
              </span>
            )
          )}
        </nav>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center rounded-md bg-card dark:bg-dark-card px-3 py-2 text-sm font-semibold text-foreground dark:text-dark-foreground ring-1 ring-inset ring-border dark:ring-dark-border hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
