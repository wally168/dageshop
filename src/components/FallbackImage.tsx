'use client'

import React from 'react'

interface Props {
  src: string
  alt: string
  className?: string
}

export default function FallbackImage({ src, alt, className }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement
        img.src = 'https://placehold.co/600x600?text=No+Image'
      }}
    />
  )
}