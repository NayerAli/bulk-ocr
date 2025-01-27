/**
 * Image processing utilities
 */

// Validate base64 data URL format
export function isValidBase64DataUrl(dataUrl: string): boolean {
  const regex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,([a-zA-Z0-9+/]+={0,2})$/
  return regex.test(dataUrl)
}

// Convert image file to base64 with size validation
export async function imageToBase64(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Only images are supported.')
  }

  // Validate file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error('File size too large. Maximum size is 10MB.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        const result = reader.result
        if (typeof result !== 'string') {
          throw new Error('Failed to convert image to base64')
        }
        
        if (!isValidBase64DataUrl(result)) {
          throw new Error('Invalid base64 image data')
        }
        
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'))
    }
    
    reader.readAsDataURL(file)
  })
}

// Compress image while maintaining quality
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions while maintaining aspect ratio
      const maxDimension = 2048 // Max dimension for OCR
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to blob with quality adjustment
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          // Convert Blob to File
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          })
          resolve(compressedFile)
        },
        file.type,
        0.8 // Quality setting (0.8 = 80% quality)
      )
    }
    
    img.onerror = () => reject(new Error('Failed to load image for compression'))
  })
}

// Process image for OCR
export async function processImageForOCR(file: File): Promise<string> {
  try {
    // First compress the image if needed
    const compressedFile = await compressImage(file)
    
    // Convert to base64
    const base64Data = await imageToBase64(compressedFile)
    
    // Validate the base64 data
    if (!isValidBase64DataUrl(base64Data)) {
      throw new Error('Invalid base64 data URL format after processing')
    }
    
    return base64Data
  } catch (error) {
    console.error('Error processing image:', error)
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper function to convert File/Blob to base64 data URL
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') {
          throw new Error('Failed to convert file to base64: Invalid result type')
        }

        // Validate the base64 data URL format
        if (!isValidBase64DataUrl(reader.result)) {
          // If invalid, try to fix the format
          const mimeType = file.type || 'application/octet-stream'
          const base64Data = reader.result.replace(/^data:.*?;base64,/, '')
          const formattedDataUrl = `data:${mimeType};base64,${base64Data}`
          
          if (!isValidBase64DataUrl(formattedDataUrl)) {
            throw new Error('Failed to create valid base64 data URL')
          }
          
          resolve(formattedDataUrl)
        } else {
          resolve(reader.result)
        }
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file: ' + (reader.error?.message || 'Unknown error')))
    }

    try {
      reader.readAsDataURL(file)
    } catch (error) {
      reject(new Error('Failed to start file reading: ' + (error instanceof Error ? error.message : 'Unknown error')))
    }
  })
} 