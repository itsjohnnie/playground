// Resize + recompress a user-supplied image so avatars stay small.
// Pipeline: Image → square center-crop → canvas at `size` × `size` → JPEG.

export interface OptimizedPhoto {
  blob: Blob
  width: number
  height: number
}

const DEFAULT_SIZE = 256
const DEFAULT_QUALITY = 0.82

export async function optimizeAvatar(
  file: File | Blob,
  size: number = DEFAULT_SIZE,
  quality: number = DEFAULT_QUALITY,
): Promise<OptimizedPhoto> {
  const bitmap = await loadBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    // Square center-crop from the source.
    const srcSide = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - srcSide) / 2
    const sy = (bitmap.height - srcSide) / 2

    ctx.drawImage(bitmap, sx, sy, srcSide, srcSide, 0, 0, size, size)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('JPEG encode failed')
    return { blob, width: size, height: size }
  } finally {
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
  }
}

async function loadBitmap(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Some browsers (older iOS Safari) reject HEIC / certain JPEGs here.
      // Fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    // Release once the bitmap is decoded — drawImage works after revoke.
    URL.revokeObjectURL(url)
  }
}
