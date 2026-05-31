'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-75"
      style={{ background: 'rgba(26,23,20,0.07)', color: '#4A4540' }}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M3.5 4V1.5h6V4M3.5 9.5H2A1 1 0 0 1 1 8.5v-3A1 1 0 0 1 2 4.5h9a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H9.5M3.5 7.5h6v4h-6v-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Print
    </button>
  )
}
