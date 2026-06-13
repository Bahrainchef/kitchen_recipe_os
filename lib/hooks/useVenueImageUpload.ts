'use client'

import { useState, useCallback } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export function useVenueImageUpload(venueId: string, onSuccess: (url: string) => void) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Use JPG, PNG or WebP')
      setTimeout(() => setError(null), 4000)
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Max 10 MB')
      setTimeout(() => setError(null), 4000)
      return
    }

    setError(null)
    setProgress(5)

    const timer = setInterval(() => {
      setProgress(p => (p !== null && p < 80 ? p + 7 : p))
    }, 250)

    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/venues/${venueId}/upload-image`, { method: 'POST', body })
      clearInterval(timer)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Upload failed (${res.status})`)
      }

      const { url } = await res.json()
      setProgress(100)
      onSuccess(url)
      setTimeout(() => setProgress(null), 800)
    } catch (e) {
      clearInterval(timer)
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Upload failed')
      setTimeout(() => setError(null), 5000)
    }
  }, [venueId, onSuccess])

  return { progress, error, upload }
}
