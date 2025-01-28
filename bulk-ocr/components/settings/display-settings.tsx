"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/lib/stores/store"

export function DisplaySettings() {
  const { settings, updateSettings } = useStore()

  const handleChange = (key: keyof typeof settings.display, value: string) => {
    if (key === "recentDocsCount" || key === "dashboardRefreshRate") {
      const numValue = Number.parseInt(value, 10)
      if (!isNaN(numValue) && numValue > 0) {
        updateSettings({
          display: {
            ...settings.display,
            [key]: numValue,
          },
        })
      }
    } else {
      updateSettings({
        display: {
          ...settings.display,
          [key]: value,
        },
      })
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select
            value={settings.display.theme}
            onValueChange={(value) => handleChange("theme", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Recent Documents Count</Label>
          <Input
            type="number"
            min="1"
            value={settings.display.recentDocsCount}
            onChange={(e) => handleChange("recentDocsCount", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Dashboard Refresh Rate (ms)</Label>
          <Input
            type="number"
            min="1000"
            step="1000"
            value={settings.display.dashboardRefreshRate}
            onChange={(e) => handleChange("dashboardRefreshRate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Date Format</Label>
          <Input
            value={settings.display.dateFormat}
            onChange={(e) => handleChange("dateFormat", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Time Format</Label>
          <Input
            value={settings.display.timeFormat}
            onChange={(e) => handleChange("timeFormat", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

