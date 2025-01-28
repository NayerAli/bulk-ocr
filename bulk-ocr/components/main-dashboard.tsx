"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Activity, Download, BarChart, Layers, Timer, Settings, Upload, AlertCircle } from "lucide-react"
import { useStore } from "@/lib/stores/store"
import { FileUpload } from "@/components/file-upload"
import { ProcessingQueue } from "@/components/processing-queue"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { formatFileSize, formatDate } from "@/lib/utils"

export function MainDashboard() {
  const { 
    jobs, 
    settings,
    isInitialized,
    isLoading,
    error,
    initialize 
  } = useStore()

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Initializing...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium text-destructive">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => initialize()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Calculate metrics
  const metrics = {
    totalPages: jobs.reduce((acc, job) => acc + (job.totalPages || 0), 0),
    processedPages: jobs.reduce((acc, job) => acc + (job.processedPages || 0), 0),
    successRate: jobs.length > 0 ? (jobs.filter((job) => job.status === "completed").length / jobs.length) * 100 : 0,
    averageTime: jobs.length > 0
      ? jobs.reduce((acc, job) => {
          if (job.completedAt && job.startedAt) {
            return acc + (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime())
          }
          return acc
        }, 0) / jobs.filter((job) => job.completedAt).length
      : 0,
    totalProcessed: jobs.filter((job) => job.status === "completed").length,
    failedJobs: jobs.filter((job) => job.status === "failed").length,
    totalSize: jobs.reduce((acc, job) => acc + (job.fileSize || 0), 0),
    activeJobs: jobs.filter((job) => job.status === "processing").length,
  }

  // Get recent completed documents
  const recentDocs = jobs
    .filter((job) => job.status === "completed")
    .sort((a, b) => {
      return (new Date(b.completedAt || 0).getTime()) - (new Date(a.completedAt || 0).getTime())
    })
    .slice(0, settings.display.recentDocsCount)

  const handleExportText = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job || !job.result) return

    const blob = new Blob([job.result], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${job.fileName.replace(/\.[^/.]+$/, "")}-extracted.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-semibold">OCR Processing System</h1>
          <SettingsDialog />
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{metrics.processedPages} pages</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.totalProcessed} documents completed
                {metrics.activeJobs > 0 && ` • ${metrics.activeJobs} in progress`}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <Layers className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{formatFileSize(metrics.totalSize)}</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.totalPages} pages total</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
              <Timer className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{(metrics.averageTime / 1000).toFixed(1)}s</div>
              <p className="text-xs text-muted-foreground mt-1">average per document</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{metrics.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.failedJobs === 0 ? 'No failed jobs' : `${metrics.failedJobs} failed jobs`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl">Upload Documents</CardTitle>
            <CardDescription>
              Upload your documents for OCR processing. Supported formats: PDF, JPG, PNG
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
              <FileUpload />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Maximum file size: {formatFileSize(settings.upload.maxFileSize)} per document
            </p>
          </CardContent>
        </Card>

        {/* Processing Queue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl">Processing Queue</CardTitle>
            <CardDescription>
              Monitor and manage your document processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No documents in the queue</p>
                <p className="text-xs text-muted-foreground mt-1">Upload documents to start processing</p>
              </div>
            ) : (
              <ProcessingQueue />
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl">Recent Documents</CardTitle>
            <CardDescription>
              View and download your processed documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {recentDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No processed documents yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Documents will appear here after processing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(doc.fileSize || 0)}</span>
                            <span>•</span>
                            <span>{doc.totalPages} pages</span>
                            <span>•</span>
                            <span>{formatDate(doc.completedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleExportText(doc.id)}
                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

