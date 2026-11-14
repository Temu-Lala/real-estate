'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  quality?: number
  blurDataURL?: string
}

/**
 * Optimized image component for large images with:
 * - Proper loading states
 * - Progressive enhancement
 * - Blur-up effect
 * - Automatic responsive sizing
 * - WebP/AVIF format conversion
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  quality = 85,
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Generate sizes string if not provided
  const defaultSizes = fill
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    : '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px'

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-(--chip) ${className}`}
        style={fill ? {} : { width, height }}
      >
        <span className="text-xs text-(--muted)">Image unavailable</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={fill ? {} : { width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-(--chip)">
          <Loader2 className="size-8 animate-spin text-(--accent)" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes || defaultSizes}
        quality={quality}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit: 'cover',
        }}
      />
    </div>
  )
}

/**
 * Property image component with gallery-specific optimizations
 */
export function PropertyImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
}: {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={priority ? 90 : 80}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  )
}

/**
 * Hero image component with highest priority and quality
 */
export function HeroImage({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      className={className}
      priority
      quality={95}
      sizes="100vw"
    />
  )
}

/**
 * Thumbnail image component for cards and galleries
 */
export function ThumbnailImage({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      className={className}
      quality={75}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  )
}
