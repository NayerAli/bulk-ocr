"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Clock, ArrowUpRight, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useStore } from "@/lib/stores/store"
import { ProcessingJob } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { formatFileSize } from "@/lib/utils"

export function RecentDocuments() {
  const router = useRouter()
  const { jobs } = useStore()
  const [recentJobs, setRecentJobs] = useState<ProcessingJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Sort jobs by creation date and take the most recent ones
    const sorted = [...jobs]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
    setRecentJobs(sorted)
    setIsLoading(false)
  }, [jobs])

  function getStatusColor(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-500/15 text-green-700 dark:text-green-400"
      case "failed":
        return "bg-red-500/15 text-red-700 dark:text-red-400"
      case "processing":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400"
      default:
        return "bg-gray-500/15 text-gray-700 dark:text-gray-400"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Your recently processed documents</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (recentJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
          <CardDescription>Your recently processed documents</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No documents processed yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a document to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your recently processed documents</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="group flex items-start gap-4 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/documents/${job.id}`)}
              >
                <div className="rounded-lg border p-2 group-hover:border-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{job.fileName}</p>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatFileSize(job.fileSize)}</span>
                    <span>{job.totalPages} pages</span>
                    <span>{Math.round(job.progress)}% complete</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

