'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = []
  const showAround = 2

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - showAround && i <= currentPage + showAround)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="flex size-9 items-center justify-center rounded-full border border-(--line) bg-(--card) text-(--muted) disabled:opacity-50 hover:border-(--accent) hover:text-(--ink)"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-(--muted)">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(Number(page))}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`flex size-9 items-center justify-center rounded-full text-sm font-medium ${
              page === currentPage
                ? 'bg-(--accent) text-[#0b1f3a]'
                : 'border border-(--line) bg-(--card) text-(--muted) hover:border-(--accent) hover:text-(--ink)'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="flex size-9 items-center justify-center rounded-full border border-(--line) bg-(--card) text-(--muted) disabled:opacity-50 hover:border-(--accent) hover:text-(--ink)"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
