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
  const jobs = useStore((state) => state.jobs)
  const settings = useStore((state) => state.settings)

  // Initialize OCR service on mount
  useEffect(() => {
    useStore.getState().initializeOCRService()
  }, [])

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

