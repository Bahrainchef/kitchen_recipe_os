'use client'

import { VenuePdfPanel } from './VenuePdfPanel'

interface Props {
  venueId: string
  initialUrl: string | null
  themeColor: string
}

export function BrandGuidelinesPanel({ venueId, initialUrl, themeColor }: Props) {
  return (
    <VenuePdfPanel
      venueId={venueId}
      apiPath="brand-guidelines"
      initialUrl={initialUrl}
      themeColor={themeColor}
      label="Brand Guidelines"
      icon="doc"
    />
  )
}
