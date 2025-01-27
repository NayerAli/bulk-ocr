"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RefreshCw, XCircle, ChevronDown, File, ImageIcon } from "lucide-react"
import { useQueue } from "@/lib/queue-manager"
import { formatFileSize } from "@/lib/utils"
import type { ProcessingStatus } from "@/lib/types"

const statusMessages: Record<ProcessingStatus, string> = {
  queued: "Waiting to be processed",
  analyzing: "Analyzing file structure",
  converting: "Converting to processable format",
  processing: "Extracting text",
  completed: "Processing complete",
  failed: "Processing failed",
}

export function ProcessingQueue() {
  const jobs = useQueue((state) => state.jobs)
  const updateJob = useQueue((state) => state.updateJob)
  const removeJob = useQueue((state) => state.removeJob)

  const handleRetry = async (jobId: string) => {
    updateJob(jobId, {
      status: "queued",
      progress: 0,
      processedPages: 0,
      error: undefined,
      details: [
        {
          stage: "retry",
          message: "Retrying processing",
          timestamp: new Date(),
        },
      ],
    })
    // Trigger reprocessing logic here
  }

  const handleCancel = (jobId: string) => {
    removeJob(jobId)
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {jobs.map((job) => (
              <Collapsible key={job.id}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {job.fileType === "pdf" ? (
                        <File className="h-5 w-5 text-blue-500" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{job.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(job.fileSize)} •
                          {job.totalPages > 1 ? ` ${job.processedPages} of ${job.totalPages} pages` : " Single page"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          job.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : job.status === "processing" || job.status === "analyzing" || job.status === "converting"
                              ? "bg-blue-100 text-blue-800"
                              : job.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {statusMessages[job.status]}
                      </span>
                      {job.status === "failed" && (
                        <Button variant="ghost" size="icon" onClick={() => handleRetry(job.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {(job.status === "queued" || job.status === "failed") && (
                        <Button variant="ghost" size="icon" onClick={() => handleCancel(job.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <Progress
                    value={job.progress}
                    className="h-2"
                    indicatorClassName={job.status === "failed" ? "bg-red-600" : undefined}
                  />
                  <CollapsibleContent>
                    <div className="mt-4 space-y-2 text-sm">
                      <h4 className="font-medium">Processing Details</h4>
                      <div className="space-y-1">
                        {job.details.map((detail, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{detail.message}</span>
                            <span className="text-muted-foreground">
                              {new Date(detail.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      {job.error && <div className="mt-2 text-xs text-red-600">Error: {job.error}</div>}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

