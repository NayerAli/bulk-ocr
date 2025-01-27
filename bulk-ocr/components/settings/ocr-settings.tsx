"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/lib/stores/store"
import { ValidationService } from "@/lib/services/validation-service"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function OCRSettings() {
  const { settings, updateOCRProvider, updateAPIKey, updateSettings } = useStore()
  const [validationState, setValidationState] = useState<{
    provider?: { isValid: boolean; message?: string }
    apiKey?: { isValid: boolean; message?: string }
  }>({})

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
    }
    setValidationState(newValidationState)
  }, [settings])

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>OCR Provider</Label>
          <Select
            value={settings.ocr.provider}
            onValueChange={(value: "claude" | "openai") => updateOCRProvider(value)}
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
          <Label>API Key</Label>
          <Input
            type="password"
            value={settings.ocr.apiKeys[settings.ocr.provider] || ""}
            onChange={(e) => updateAPIKey(settings.ocr.provider, e.target.value)}
            placeholder={`Enter your ${settings.ocr.provider} API key`}
            className={cn(validationState.apiKey?.isValid === false && "border-red-500 focus-visible:ring-red-500")}
          />
          {validationState.apiKey?.message && (
            <p className="text-sm text-red-500 mt-1">{validationState.apiKey.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Your API key will be stored securely and only used for OCR processing.
          </p>
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

