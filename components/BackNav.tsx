'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface Crumb {
  label: string
  href?: string
}

interface Props {
  crumbs: Crumb[]
}

export function BackNav({ crumbs }: Props) {
  const router = useRouter()
  const parentCrumb = crumbs.at(-2)

  return (
    <>
      {/* Top: Home icon + breadcrumb trail */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          aria-label="Go to Dashboard"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/08 text-text-muted hover:text-text-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M1.5 7L8 1.5 14.5 7V14a.5.5 0 0 1-.5.5H10V10H6v4.5H2a.5.5 0 0 1-.5-.5V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </Link>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-[12px] tablet:text-[13px]">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && (
                  <svg width="5" height="9" viewBox="0 0 5 9" fill="none" aria-hidden className="shrink-0 opacity-30">
                    <path d="M1 1l3 3.5L1 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isLast ? (
                  <span className="text-text-primary font-medium truncate">{crumb.label}</span>
                ) : crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-text-muted hover:text-text-secondary transition-colors truncate shrink-0"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-muted truncate shrink-0">{crumb.label}</span>
                )}
              </span>
            )
          })}
        </nav>
      </div>

      {/* Fixed floating back button — bottom-left, thumb-friendly */}
      {parentCrumb && (
        <div className="fixed bottom-6 left-6 z-50 no-print floating-back-safe">
          <button
            onClick={() => parentCrumb.href ? router.push(parentCrumb.href) : router.back()}
            aria-label={`Back to ${parentCrumb.label}`}
            className="flex items-center gap-2.5 pl-4 pr-5 rounded-full font-semibold text-[14px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              height: 56,
              background: '#122347',
              color: '#f0f4ff',
              boxShadow: '0 8px 28px rgba(0,0,0,0.50), 0 2px 6px rgba(0,0,0,0.25)',
              border: '1px solid rgba(126,184,247,0.14)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to {parentCrumb.label}</span>
          </button>
        </div>
      )}
    </>
  )
}
