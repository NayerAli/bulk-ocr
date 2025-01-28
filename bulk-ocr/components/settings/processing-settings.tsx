"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/stores/store"

export function ProcessingSettings() {
  const { settings, updateSettings } = useStore()

  const handleChange = (key: keyof typeof settings.processing, value: string) => {
    const numValue = Number.parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      updateSettings({
        processing: {
          ...settings.processing,
          [key]: numValue,
        },
      })
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Maximum Concurrent Jobs</Label>
          <Input
            type="number"
            min="1"
            value={settings.processing.maxConcurrentJobs}
            onChange={(e) => handleChange("maxConcurrentJobs", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Pages per Chunk</Label>
          <Input
            type="number"
            min="1"
            value={settings.processing.chunkSize}
            onChange={(e) => handleChange("chunkSize", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Concurrent Chunks</Label>
          <Input
            type="number"
            min="1"
            value={settings.processing.concurrentChunks}
            onChange={(e) => handleChange("concurrentChunks", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Retry Attempts</Label>
          <Input
            type="number"
            min="0"
            value={settings.processing.retryAttempts}
            onChange={(e) => handleChange("retryAttempts", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Retry Delay (ms)</Label>
          <Input
            type="number"
            min="0"
            step="100"
            value={settings.processing.retryDelay}
            onChange={(e) => handleChange("retryDelay", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

