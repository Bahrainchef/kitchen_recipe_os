'use client'

import Link from 'next/link'
import { useState } from 'react'

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div
      className="announcement-banner relative flex flex-col text-[13px] font-medium text-white overflow-hidden"
      style={{ background: 'linear-gradient(90deg, #d4608e 0%, #4a90d9 100%)' }}
    >
      {/* Content row */}
      <div className="flex items-center justify-center gap-3 px-4 py-2.5">
        <span className="shrink-0 text-[10px] font-black tracking-widest uppercase opacity-90 border border-white/30 rounded px-1.5 py-0.5">
          New
        </span>
        <span className="opacity-95">
          Recipe import from ChefTap now live · 510+ recipes loaded
        </span>
        <Link
          href="/import"
          className="shrink-0 underline underline-offset-2 opacity-85 hover:opacity-100 transition-opacity"
        >
          Import now →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {/* Animated pink → blue → teal gradient line */}
      <div className="banner-gradient-line" />
    </div>
  )
}
