"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSettings } from "@/lib/stores/settings-store"

export function DisplaySettings() {
  const { settings, updateSettings } = useSettings()

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Recent Documents Count</Label>
          <Input
            type="number"
            min="1"
            max="50"
            value={settings.display.recentDocsCount}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10)
              if (!isNaN(value) && value > 0) {
                updateSettings({
                  display: {
                    ...settings.display,
                    recentDocsCount: value,
                  },
                })
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Dashboard Refresh Rate (ms)</Label>
          <Input
            type="number"
            min="1000"
            step="1000"
            value={settings.display.dashboardRefreshRate}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10)
              if (!isNaN(value) && value >= 1000) {
                updateSettings({
                  display: {
                    ...settings.display,
                    dashboardRefreshRate: value,
                  },
                })
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Theme</Label>
          <Select
            value={settings.display.theme}
            onValueChange={(value: "light" | "dark" | "system") =>
              updateSettings({
                display: {
                  ...settings.display,
                  theme: value,
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Format</Label>
          <Input
            value={settings.display.dateFormat}
            onChange={(e) =>
              updateSettings({
                display: {
                  ...settings.display,
                  dateFormat: e.target.value,
                },
              })
            }
            placeholder="PP"
          />
        </div>

        <div className="space-y-2">
          <Label>Time Format</Label>
          <Input
            value={settings.display.timeFormat}
            onChange={(e) =>
              updateSettings({
                display: {
                  ...settings.display,
                  timeFormat: e.target.value,
                },
              })
            }
            placeholder="pp"
          />
        </div>
      </CardContent>
    </Card>
  )
}

