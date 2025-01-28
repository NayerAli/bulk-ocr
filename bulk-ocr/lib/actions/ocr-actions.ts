'use server'

import { OCRService } from '../services/ocr-service'

interface Model {
  id: string
  created_at: string
  display_name: string
  type: string
}

interface ModelsResponse {
  data: Model[]
  has_more: boolean
  first_id: string | null
  last_id: string | null
}

// Cache for storing model lists by provider
const MODEL_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
interface ModelCache {
  timestamp: number
  models: Array<{ id: string; name: string }>
}
const modelCache: Record<string, ModelCache> = {}

function getCachedModels(provider: string): Array<{ id: string; name: string }> | null {
  const cache = modelCache[provider]
  if (!cache) return null
  
  const isExpired = Date.now() - cache.timestamp > MODEL_CACHE_DURATION
  return isExpired ? null : cache.models
}

function setCachedModels(provider: string, models: Array<{ id: string; name: string }>) {
  modelCache[provider] = {
    timestamp: Date.now(),
    models
  }
}

async function testClaudeAPI(apiKey: string) {
  const url = 'https://api.anthropic.com/v1/models'
  console.log('\nTesting Claude API:')
  console.log('GET', url)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API request failed')
    }

    const data: ModelsResponse = await response.json()
    const compatibleModels = data.data.filter(model => 
      model.id.includes('claude-3') || model.id.includes('claude-2')
    )
    
    return { 
      success: true,
      models: compatibleModels.map(model => ({
        id: model.id,
        name: model.display_name
      }))
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'API request timed out. Please try again.'
      }
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'API request failed'
    }
  }
}

async function testModelVisionCapability(apiKey: string, modelId: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            {
              type: "image_url",
              image_url: {
                // Minimal 1x1 transparent PNG
                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
              }
            }
          ]
        }],
        max_tokens: 1
      })
    })

    const data = await response.json()
    return !data.error
  } catch (error) {
    return false
  }
}

async function testOpenAIAPI(apiKey: string) {
  const url = 'https://api.openai.com/v1/models'
  console.log('\nTesting OpenAI API:')
  console.log('GET', url)
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API request failed')
    }

    const data = await response.json()
    
    console.log('Testing vision capabilities for all available models...')
    
    // Test all models for vision capability
    const visionTestResults = await Promise.all(
      data.data.map(async (model: any) => {
        const hasVision = await testModelVisionCapability(apiKey, model.id)
        return {
          ...model,
          hasVision
        }
      })
    )

    const compatibleModels = visionTestResults.filter(model => model.hasVision)
    
    if (compatibleModels.length === 0) {
      throw new Error('No vision-capable models found. Please ensure your API key has access to vision-enabled models.')
    }

    // Sort models to show newest first (usually contains model version in name)
    const sortedModels = compatibleModels.sort((a, b) => b.id.localeCompare(a.id))

    return { 
      success: true,
      models: sortedModels.map((model: any) => ({
        id: model.id,
        name: model.id,
        isVisionCapable: true
      }))
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'API request timed out. Please try again.'
      }
    }
    // Check for specific OpenAI error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          success: false,
          error: 'Invalid API key or insufficient permissions. Please check your API key and ensure you have access to vision-enabled models.'
        }
      }
      if (error.message.includes('Rate limit')) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again in a few minutes.'
        }
      }
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'API request failed'
    }
  }
}

export async function validateAPIConfiguration(provider: string, apiKey: string) {
  console.log(`\n=== Testing ${provider.toUpperCase()} API Configuration ===`)
  
  try {
    // Validate API key format based on provider
    if (!apiKey.startsWith('sk-')) {
      throw new Error(`Invalid ${provider} API key format. API key must start with 'sk-'`)
    }

    // Check cache first
    const cachedModels = getCachedModels(provider)
    if (cachedModels) {
      console.log('✓ Using cached models\n')
      return { 
        success: true,
        models: cachedModels
      }
    }

    // Then fetch available models
    const result = provider === 'claude' 
      ? await testClaudeAPI(apiKey)
      : await testOpenAIAPI(apiKey)
    
    if (!result.success) {
      throw new Error(result.error)
    }

    if (!result.models?.length) {
      throw new Error(`No compatible ${provider === 'claude' ? 'Claude-2/3' : 'vision-capable'} models found. Please check your API access.`)
    }

    // Cache the results
    setCachedModels(provider, result.models)

    console.log('✓ API test successful\n')
    return { 
      success: true,
      models: result.models
    }
  } catch (error: unknown) {
    console.error('✗ API test failed:', error instanceof Error ? error.message : 'Unknown error', '\n')
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'API validation failed' 
    }
  }
}

// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB

export async function processImage(imageData: string, settings: any) {
  try {
    // Validate image data format
    if (!imageData) {
      throw new Error('No image data provided')
    }

    // Extract MIME type and validate format
    const mimeMatch = imageData.match(/^data:([^;]+);base64,/)
    if (!mimeMatch) {
      throw new Error('Invalid image data format. Must be a valid base64 data URL')
    }

    const mimeType = mimeMatch[1]
    if (!SUPPORTED_FORMATS.includes(mimeType)) {
      throw new Error(`Unsupported image format: ${mimeType}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`)
    }

    // Validate image size
    const base64Data = imageData.split(',')[1]
    const sizeInBytes = Buffer.from(base64Data, 'base64').length
    if (sizeInBytes > MAX_IMAGE_SIZE) {
      throw new Error(`Image size exceeds maximum limit of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`)
    }

    // Initialize OCR service with settings
    const service = new OCRService(settings.ocr)
    
    // Process the image
    const result = await service.processImage(imageData)
    
    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed')
    }
    
    return {
      success: true,
      text: result.text,
      metadata: {
        mimeType,
        sizeInBytes,
        timestamp: Date.now(),
        width: 0, // These will be set by the image processing
        height: 0,
        dpi: 0,
        orientation: 0
      }
    }
  } catch (error: unknown) {
    console.error('OCR processing error:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed'
    }
  }
} 
