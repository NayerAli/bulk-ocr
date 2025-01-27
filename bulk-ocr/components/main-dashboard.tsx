"use client"

import { FileUpload } from "@/components/file-upload"
import { ProcessingQueue } from "@/components/processing-queue"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { PerformanceCharts } from "@/components/dashboard/performance-charts"
import { RecentDocuments } from "@/components/dashboard/recent-documents"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { useStore } from "@/lib/stores/store"
import { useEffect } from "react"

export function MainDashboard() {
  const { jobs, updateMetrics, settings } = useStore()

  // Update metrics periodically
  useEffect(() => {
    updateMetrics(jobs)

    const interval = setInterval(() => {
      updateMetrics(jobs)
    }, settings.display.dashboardRefreshRate)

    return () => clearInterval(interval)
  }, [jobs, updateMetrics, settings.display.dashboardRefreshRate])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">OCR Processing System</h1>
        <SettingsDialog />
      </div>

      <div className="grid gap-8">
        <FileUpload />
        <ProcessingQueue />
        <MetricsCards />

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          <PerformanceCharts />
          <RecentDocuments />
        </div>
      </div>
    </div>
  )
}

