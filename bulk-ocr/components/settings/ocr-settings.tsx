"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Eye, EyeOff } from "lucide-react"
import { useSettings } from "@/lib/stores/settings-store"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function OCRSettings() {
  const { settings, updateSettings, updateOCRProvider, updateAPIKey } = useSettings()
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleTestConnection = async () => {
    setTestStatus(null)
    try {
      const response = await fetch("/api/test-ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: settings.ocr.provider,
          apiKey: settings.ocr.apiKeys[settings.ocr.provider],
        }),
      })

      const data = await response.json()
      setTestStatus({
        success: response.ok,
        message: data.message || (response.ok ? "Connection successful!" : "Connection failed"),
      })
    } catch (error) {
      setTestStatus({
        success: false,
        message: "Failed to test connection",
      })
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>OCR Provider</Label>
          <Select
            value={settings.ocr.provider}
            onValueChange={(value: "claude" | "openai") => updateOCRProvider(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.ocr.provider === "claude" && (
          <div className="space-y-2">
            <Label>Claude API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={settings.ocr.apiKeys.claude || ""}
                  onChange={(e) => updateAPIKey("claude", e.target.value)}
                  placeholder="Enter Claude API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleTestConnection}>Test Connection</Button>
            </div>
          </div>
        )}

        {settings.ocr.provider === "openai" && (
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={settings.ocr.apiKeys.openai || ""}
                  onChange={(e) => updateAPIKey("openai", e.target.value)}
                  placeholder="Enter OpenAI API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleTestConnection}>Test Connection</Button>
            </div>
          </div>
        )}

        {testStatus && (
          <Alert variant={testStatus.success ? "default" : "destructive"}>
            <AlertDescription>{testStatus.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={settings.ocr.language}
            onValueChange={(value: "arabic" | "persian") =>
              updateSettings({
                ocr: { ...settings.ocr, language: value },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabic">Arabic</SelectItem>
              <SelectItem value="persian">Persian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Minimum Confidence Score ({(settings.ocr.confidence * 100).toFixed(0)}%)</Label>
          <Slider
            value={[settings.ocr.confidence * 100]}
            onValueChange={([value]) =>
              updateSettings({
                ocr: { ...settings.ocr, confidence: value / 100 },
              })
            }
            max={100}
            step={1}
          />
        </div>
      </CardContent>
    </Card>
  )
}

