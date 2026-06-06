'use client'

import { useEffect, useRef } from 'react'

const HERO_URL =
  'https://vuxpsnjbciyowpkbgwlv.supabase.co/storage/v1/object/public/venue-images/app-hero-bg.jpg'

export function DashboardHero() {
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        if (imgRef.current) {
          const scrollY = window.scrollY
          imgRef.current.style.transform = `translateY(${scrollY * 0.30}px)`
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
      style={{ height: 220 }}
      aria-hidden
    >
      {/* Parallax image layer */}
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
        style={{
          background: 'linear-gradient(to bottom, rgba(11,31,74,0.45) 0%, rgba(11,31,74,0.60) 60%, rgba(11,31,74,0.82) 100%)',
        }}
      />

      {/* Text content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <p
          className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-2"
          style={{ color: '#4ecdc4' }}
        >
          F&amp;B Group
        </p>
        <h1
          className="font-fraunces text-[36px] tablet:text-[48px] leading-none tracking-tight mb-2"
          style={{ color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.40)' }}
        >
          Kitchen Recipe OS
        </h1>
        <p
          className="text-[15px] tablet:text-[17px] font-light"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          Your venues
        </p>
      </div>

      {/* Bottom fade into page bg */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 40, background: 'linear-gradient(to bottom, transparent, #0B1F4A)' }}
      />
    </div>
  )
}
