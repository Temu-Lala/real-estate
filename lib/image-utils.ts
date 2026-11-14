/**
 * Image optimization utilities for handling large images
 */

/**
 * Generates a responsive sizes string for Next.js Image component
 * based on the image's usage context
 */
export function getImageSizes(context: 'hero' | 'card' | 'gallery' | 'thumbnail'): string {
  switch (context) {
    case 'hero':
      return '100vw'
    case 'card':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    case 'gallery':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px'
    case 'thumbnail':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    default:
      return '100vw'
  }
}

/**
 * Determines appropriate image quality based on priority and context
 */
export function getImageQuality(priority: boolean, context: 'hero' | 'card' | 'gallery' | 'thumbnail'): number {
  if (priority) {
    return context === 'hero' ? 95 : 90
  }
  switch (context) {
    case 'hero':
      return 85
    case 'card':
      return 75
    case 'gallery':
      return 80
    case 'thumbnail':
      return 70
    default:
      return 80
  }
}

/**
 * Calculates optimal image dimensions for different contexts
 * to prevent serving unnecessarily large images
 */
export function getOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  context: 'hero' | 'card' | 'gallery' | 'thumbnail'
): { width: number; height: number } {
  const maxWidths = {
    hero: 3840,      // 4K
    card: 1200,      // Desktop card
    gallery: 2560,   // Large gallery image
    thumbnail: 800,  // Small thumbnail
  }

  const max = maxWidths[context]

  // If image is already smaller than max, keep original
  if (originalWidth <= max) {
    return { width: originalWidth, height: originalHeight }
  }

  // Calculate new dimensions maintaining aspect ratio
  const ratio = originalHeight / originalWidth
  const newWidth = max
  const newHeight = Math.round(newWidth * ratio)

  return { width: newWidth, height: newHeight }
}

/**
 * Checks if an image is considered "large" and needs special handling
 */
export function isLargeImage(width: number, height: number): boolean {
  // Consider images larger than 2MP as "large"
  return (width * height) > 2_000_000
}

/**
 * Generates a low-quality image placeholder (LQIP) URL
 * for blur-up effect
 */
export function generateBlurPlaceholder(url: string): string {
  // This would typically be processed by an image service
  // For now, return empty string (Next.js will handle it)
  return ''
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Estimates compressed file size based on dimensions and quality
 */
export function estimateCompressedSize(
  width: number,
  height: number,
  quality: number,
  format: 'jpeg' | 'webp' | 'avif' = 'webp'
): number {
  const pixels = width * height
  const bytesPerPixel = format === 'avif' ? 0.2 : format === 'webp' ? 0.25 : 0.35
  const qualityFactor = quality / 100
  return Math.round(pixels * bytesPerPixel * qualityFactor)
}
