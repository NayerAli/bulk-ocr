"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/stores/store"
import { formatFileSize } from "@/lib/utils"

export function UploadSettings() {
  const { settings, updateSettings } = useStore()

  const handleChange = (key: keyof typeof settings.upload, value: string) => {
    if (key === "maxFileSize" || key === "maxSimultaneousUploads") {
      const numValue = Number.parseInt(value, 10)
      if (!isNaN(numValue) && numValue > 0) {
        updateSettings({
          upload: {
            ...settings.upload,
            [key]: key === "maxFileSize" ? numValue * 1024 * 1024 : numValue,
          },
        })
      }
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Maximum File Size (MB)</Label>
          <Input
            type="number"
            min="1"
            value={Math.floor(settings.upload.maxFileSize / (1024 * 1024))}
            onChange={(e) => handleChange("maxFileSize", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Current: {formatFileSize(settings.upload.maxFileSize)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Maximum Simultaneous Uploads</Label>
          <Input
            type="number"
            min="1"
            value={settings.upload.maxSimultaneousUploads}
            onChange={(e) => handleChange("maxSimultaneousUploads", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

