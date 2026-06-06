'use client'

import { useEffect, useRef } from 'react'

const HERO_URL =
  'https://vuxpsnjbciyowpkbgwlv.supabase.co/storage/v1/object/public/venue-images/app-hero-bg.jpg'

interface Props {
  totalVenues: number
  totalSections: number
  totalRecipes: number
}

export function DashboardHero({ totalVenues, totalSections, totalRecipes }: Props) {
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        if (imgRef.current) {
          imgRef.current.style.transform = `translateY(${window.scrollY * 0.28}px)`
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 200 }}
    >
      {/* Parallax photo */}
      <div
        ref={imgRef}
        className="absolute inset-x-0"
        style={{ top: '-15%', height: '130%', willChange: 'transform' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_URL}
          alt=""
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.50)' }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-2">
        <h1
          className="font-fraunces italic leading-none tracking-tight"
          style={{
            color: '#ffffff',
            fontSize: 'clamp(28px, 5vw, 52px)',
            textShadow: '0 2px 24px rgba(0,0,0,0.50)',
          }}
        >
          Kitchen Recipe OS
        </h1>

        <p
          className="text-[13px] tablet:text-[14px] font-light tracking-wide"
          style={{ color: 'rgba(255,255,255,0.70)' }}
        >
          F&amp;B Group &nbsp;·&nbsp; {totalVenues} Venues &nbsp;·&nbsp; Bahrain &amp; Saudi Arabia
        </p>

        {/* Stat badges */}
        <div className="flex items-center gap-2 mt-1">
          <StatBadge value={totalRecipes} label="recipes" />
          <StatBadge value={totalSections} label="sections" />
          <StatBadge value={totalVenues} label="venues" color="#4ecdc4" pulse />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 48, background: 'linear-gradient(to bottom, transparent, #0B1F4A)' }}
      />
    </div>
  )
}

function StatBadge({
  value, label, color = 'rgba(255,255,255,0.80)', pulse = false,
}: {
  value: number; label: string; color?: string; pulse?: boolean
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
      style={{
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.14)',
        color: 'rgba(255,255,255,0.80)',
      }}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full status-dot-pulse shrink-0" style={{ background: color }} />
      )}
      <span className="font-bold tabular-nums" style={{ color }}>{value}</span>
      <span>{label}</span>
    </div>
  )
}
