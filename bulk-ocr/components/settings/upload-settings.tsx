"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useSettings } from "@/lib/stores/settings-store"
import { formatFileSize } from "@/lib/utils"

export function UploadSettings() {
  const { settings, updateSettings } = useSettings()

  const handleMaxFileSizeChange = (value: string) => {
    const size = Number.parseInt(value, 10) * 1024 * 1024 // Convert MB to bytes
    if (!isNaN(size) && size > 0) {
      updateSettings({
        upload: {
          ...settings.upload,
          maxFileSize: size,
        },
      })
    }
  }

  const handleFileTypesChange = (value: string) => {
    const types = value.split(",").map((t) => t.trim())
    updateSettings({
      upload: {
        ...settings.upload,
        allowedFileTypes: types,
      },
    })
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
            onChange={(e) => handleMaxFileSizeChange(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">Current: {formatFileSize(settings.upload.maxFileSize)}</p>
        </div>

        <div className="space-y-2">
          <Label>Allowed File Types</Label>
          <Input
            value={settings.upload.allowedFileTypes.join(", ")}
            onChange={(e) => handleFileTypesChange(e.target.value)}
            placeholder=".pdf, .jpg, .jpeg, .png"
          />
          <p className="text-sm text-muted-foreground">Comma-separated list of file extensions</p>
        </div>

        <div className="space-y-2">
          <Label>Maximum Simultaneous Uploads</Label>
          <Input
            type="number"
            min="1"
            value={settings.upload.maxSimultaneousUploads}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10)
              if (!isNaN(value) && value > 0) {
                updateSettings({
                  upload: {
                    ...settings.upload,
                    maxSimultaneousUploads: value,
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

