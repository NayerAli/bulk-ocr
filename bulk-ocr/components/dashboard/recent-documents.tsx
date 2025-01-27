"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useProcessingStore } from "@/lib/stores/processing-store"
import { formatFileSize } from "@/lib/utils"
import { Download, FileText } from "lucide-react"
import { useSettings } from "@/lib/stores/settings-store"

export function RecentDocuments() {
  const jobs = useProcessingStore((state) => state.jobs)
  const settings = useSettings((state) => state.settings)

  // Get recent completed documents
  const recentDocs = jobs
    .filter((job) => job.status === "completed")
    .sort((a, b) => {
      return (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    })
    .slice(0, settings.display.recentDocsCount)

  const handleExportText = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    const text = `Sample extracted text for ${job.fileName}`
    const blob = new Blob([text], { type: "text/plain" })
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
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.fileName}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{doc.totalPages} pages</span>
                      <span>•</span>
                      <span>{doc.completedAt?.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleExportText(doc.id)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

