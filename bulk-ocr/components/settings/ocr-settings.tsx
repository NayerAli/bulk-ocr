"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/lib/stores/store"
import { ValidationService } from "@/lib/services/validation-service"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Beaker, Eye, EyeOff, X, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { validateAPIConfiguration } from "@/lib/actions/ocr-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Model {
  id: string
  name: string
  isVisionCapable?: boolean
}

export function OCRSettings() {
  const { settings, updateOCRProvider, updateAPIKey, updateSettings } = useStore()
  const [validationState, setValidationState] = useState<{
    provider?: { isValid: boolean; message?: string }
    apiKey?: { isValid: boolean; message?: string }
    model?: { isValid: boolean; message?: string }
  }>({})
  const [localApiKey, setLocalApiKey] = useState("")
  const [debouncedUpdateTimer, setDebouncedUpdateTimer] = useState<NodeJS.Timeout>()
  const [isTestingAPI, setIsTestingAPI] = useState(false)
  const [testingStage, setTestingStage] = useState<string>("")
  const [availableModels, setAvailableModels] = useState<Model[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Validate settings on mount and when they change
  useEffect(() => {
    const { errors } = ValidationService.validateConfiguration(settings)
    const newValidationState = {
      provider: {
        isValid: !errors.some((e) => e.field === "ocr.provider"),
        message: errors.find((e) => e.field === "ocr.provider")?.message,
      },
      apiKey: {
        isValid: !errors.some((e) => e.field === "ocr.apiKeys"),
        message: errors.find((e) => e.field === "ocr.apiKeys")?.message,
      },
      model: {
        isValid: settings.ocr.model !== "",
        message: settings.ocr.model === "" ? "Please select a model" : undefined
      }
    }
    setValidationState(newValidationState)
  }, [settings])

  // Update local state when provider changes
  useEffect(() => {
    setLocalApiKey(settings.ocr.apiKeys[settings.ocr.provider] || "")
    // Reset validation state and models when provider changes
    setValidationState(prev => ({
      ...prev,
      apiKey: undefined,
      model: undefined
    }))
    setAvailableModels([])
    // Clear model selection when provider changes
    updateSettings({
      ocr: {
        ...settings.ocr,
        model: ""
      }
    })
  }, [settings.ocr.provider])

  const handleTestAPI = async () => {
    setIsTestingAPI(true)
    setIsLoadingModels(true)
    setTestingStage("Validating API key format...")
    
    try {
      setTestingStage(`Connecting to ${settings.ocr.provider} API...`)
      const result = await validateAPIConfiguration(settings.ocr.provider, localApiKey)
      
      if (result.success) {
        setTestingStage("Loading available models...")
        // Update the store with the validated API key
        updateAPIKey(settings.ocr.provider, localApiKey)
        
        toast.success("API key validated! Please select a model to continue.")
        setValidationState(prev => ({
          ...prev,
          apiKey: { isValid: true, message: undefined },
          model: { isValid: false, message: "Please select a model" }
        }))
        setAvailableModels(result.models || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API validation failed")
      setValidationState(prev => ({
        ...prev,
        apiKey: { isValid: false, message: error instanceof Error ? error.message : "Invalid configuration" },
        model: undefined
      }))
      setAvailableModels([])
      // Clear model selection on API validation failure
      updateSettings({
        ocr: {
          ...settings.ocr,
          model: ""
        }
      })
    } finally {
      setIsTestingAPI(false)
      setIsLoadingModels(false)
      setTestingStage("")
    }
  }

  const handleClearSettings = () => {
    updateAPIKey(settings.ocr.provider, "")
    setLocalApiKey("")
    setValidationState(prev => ({
      ...prev,
      apiKey: undefined,
      model: undefined
    }))
    setAvailableModels([])
    updateSettings({
      ocr: {
        ...settings.ocr,
        model: ""
      }
    })
    toast.success("Settings cleared")
  }

  const handleApiKeyChange = (value: string) => {
    // Update local state immediately
    setLocalApiKey(value)
    
    // Debounce the store update
    if (debouncedUpdateTimer) {
      clearTimeout(debouncedUpdateTimer)
    }
    
    const timer = setTimeout(() => {
      updateAPIKey(settings.ocr.provider, value)
    }, 300)

    setDebouncedUpdateTimer(timer)
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>OCR Provider</Label>
          <Select
            value={settings.ocr.provider}
            onValueChange={(value: "claude" | "openai") => {
              updateOCRProvider(value)
              // Clear API validation state when provider changes
              setValidationState(prev => ({
                ...prev,
                apiKey: undefined
              }))
            }}
          >
            <SelectTrigger
              className={cn(
                validationState.provider?.isValid === false && "border-red-500 focus-visible:ring-red-500"
              )}
            >
              <SelectValue placeholder="Select OCR provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
          {validationState.provider?.message && (
            <p className="text-sm text-red-500 mt-1">{validationState.provider.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>API Key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSettings}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Settings
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                value={localApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault()
                  const pastedText = e.clipboardData.getData('text')
                  handleApiKeyChange(pastedText)
                }}
                placeholder={`Enter your ${settings.ocr.provider} API key`}
                className={cn(
                  "pr-20",
                  validationState.apiKey?.isValid === false && "border-red-500 focus-visible:ring-red-500"
                )}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <div className="absolute right-0 top-0 h-full flex items-center pointer-events-none">
                <div className="pointer-events-auto">
                  {localApiKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-full px-2 hover:bg-transparent"
                      onClick={() => handleApiKeyChange("")}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Clear API key</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-full px-3 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showApiKey ? "Hide API key" : "Show API key"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAPI}
              disabled={isTestingAPI || !localApiKey}
              className="min-w-[140px] relative"
            >
              {isTestingAPI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {testingStage || "Testing API..."}
                </>
              ) : validationState.apiKey?.isValid === true ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  API Validated
                </>
              ) : validationState.apiKey?.isValid === false ? (
                <>
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  Validation Failed
                </>
              ) : (
                "Validate API Key"
              )}
            </Button>
          </div>
          {validationState.apiKey?.message && (
            <p className="text-sm text-red-500 mt-1">{validationState.apiKey.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Your API key will be stored securely and only used for OCR processing.
            {isTestingAPI && (
              <span className="block mt-1 text-amber-500">
                {testingStage} This may take a few moments...
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Test Mode</Label>
            <p className="text-xs text-muted-foreground">
              Limit token usage for testing (100 tokens)
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={settings.ocr.isTestMode}
                    onCheckedChange={(checked) => 
                      updateSettings({ ocr: { ...settings.ocr, isTestMode: checked } })
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enable test mode to limit token usage and costs during development</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          {isLoadingModels ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Loading available models...
              </p>
            </div>
          ) : (
            <Select
              value={settings.ocr.model}
              onValueChange={(value) => {
                updateSettings({ ocr: { ...settings.ocr, model: value } })
                setValidationState(prev => ({
                  ...prev,
                  model: { isValid: true, message: undefined }
                }))
              }}
              disabled={availableModels.length === 0}
            >
              <SelectTrigger className={cn(
                validationState.model?.isValid === false && "border-red-500 focus-visible:ring-red-500"
              )}>
                <SelectValue placeholder={availableModels.length === 0 ? "Validate API key to load models" : "Select model"} />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {model.name}
                      {model.isVisionCapable && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Vision
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {availableModels.length === 0 && !isLoadingModels && !validationState.apiKey?.isValid && (
            <p className="text-sm text-muted-foreground">
              Validate your API key to see available models
            </p>
          )}
          {validationState.model?.message && (
            <p className="text-sm text-amber-500">
              {validationState.model.message}
            </p>
          )}
          {availableModels.length > 0 && !settings.ocr.model && (
            <p className="text-sm text-amber-500">
              Please select a model to use for OCR processing
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={settings.ocr.language}
            onValueChange={(value) => updateSettings({ ocr: { ...settings.ocr, language: value } })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabic">Arabic</SelectItem>
              <SelectItem value="persian">Persian</SelectItem>
              <SelectItem value="english">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Retry Attempts</Label>
          <Input
            type="number"
            min="0"
            max="5"
            value={settings.ocr.retryAttempts}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10)
              if (!isNaN(value) && value >= 0) {
                updateSettings({
                  ocr: {
                    ...settings.ocr,
                    retryAttempts: value,
                  },
                })
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Retry Delay (ms)</Label>
          <Input
            type="number"
            min="0"
            step="100"
            value={settings.ocr.retryDelay}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10)
              if (!isNaN(value) && value >= 0) {
                updateSettings({
                  ocr: {
                    ...settings.ocr,
                    retryDelay: value,
                  },
                })
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

