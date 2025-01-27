"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, XCircle, ChevronDown, File, ImageIcon, Settings, AlertCircle } from "lucide-react"
import { useStore } from "@/lib/stores/store"
import { ValidationService } from "@/lib/services/validation-service"
import { formatFileSize, formatBytes, formatDate, cn } from "@/lib/utils"
import type { ProcessingStatus, ProcessingJob } from "@/lib/types"
import { DocumentViewer } from "./document-viewer"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const statusMessages: Record<ProcessingStatus, string> = {
  queued: "Waiting to be processed",
  analyzing: "Analyzing file structure",
  converting: "Converting to processable format",
  processing: "Extracting text",
  completed: "Processing complete",
  failed: "Processing failed",
}

interface ResultPreviewProps {
  jobId: string
  onClose: () => void
}

function ResultPreview({ jobId, onClose }: ResultPreviewProps) {
  const job = useStore((state) => state.jobs.find(j => j.id === jobId))
  
  if (!job) return null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Processing Results - {job.file.name}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="mt-4 h-full">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">File Details</p>
                <p>Size: {formatBytes(job.metadata?.sizeInBytes || 0)}</p>
                <p>Type: {job.metadata?.mimeType}</p>
                <p>Processed: {formatDate(job.metadata?.timestamp)}</p>
              </div>
              <div>
                <p className="font-medium">Processing Status</p>
                <p>Status: {job.status}</p>
                {job.error && (
                  <p className="text-red-500">Error: {job.error}</p>
                )}
              </div>
            </div>

            {job.result && (
              <div>
                <p className="font-medium mb-2">Extracted Text</p>
                <Card className="p-4 max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {job.result}
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function ProcessingQueue() {
  const jobs = useStore((state) => state.jobs)
  const settings = useStore((state) => state.settings)
  const updateJob = useStore((state) => state.updateJob)
  const removeJob = useStore((state) => state.removeJob)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Check configuration validity
  const configValidation = ValidationService.validateConfiguration(settings)
  const hasConfigErrors = !configValidation.isValid

  const handleRetry = async (jobId: string) => {
    // Validate configuration before retrying
    if (hasConfigErrors) {
      return // The UI will show the config error state
    }

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
  }

  const handleCancel = (jobId: string) => {
    removeJob(jobId)
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {hasConfigErrors && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <p>Processing is paused due to configuration issues:</p>
                <ul className="list-disc pl-4 text-sm">
                  {configValidation.errors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-fit"
                  onClick={() => document.getElementById("settings-dialog-trigger")?.click()}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Open Settings
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {jobs.map((job) => (
                <Collapsible key={job.id}>
                  <div 
                    className={cn(
                      "space-y-2 p-2 rounded-lg transition-colors",
                      job.status === "completed" && "hover:bg-accent cursor-pointer"
                    )}
                  >
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
                          className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            job.status === "completed" && "bg-green-100 text-green-800",
                            (job.status === "processing" || job.status === "analyzing" || job.status === "converting") &&
                              "bg-blue-100 text-blue-800",
                            job.status === "failed" && "bg-red-100 text-red-800",
                            job.status === "queued" && hasConfigErrors && "bg-yellow-100 text-yellow-800",
                            job.status === "queued" && !hasConfigErrors && "bg-gray-100 text-gray-800"
                          )}
                        >
                          {job.status === "queued" && hasConfigErrors
                            ? "Waiting for configuration"
                            : statusMessages[job.status]}
                        </span>
                        {job.status === "failed" && !hasConfigErrors && (
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
                      indicatorClassName={cn(
                        job.status === "failed" && "bg-red-600",
                        hasConfigErrors && job.status === "queued" && "bg-yellow-600"
                      )}
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
                        {job.error && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{job.error}</AlertDescription>
                          </Alert>
                        )}
                        {job.status === "queued" && hasConfigErrors && (
                          <Alert variant="warning" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              This job is waiting for configuration issues to be resolved before processing can begin.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedJobId && (
        <ResultPreview 
          jobId={selectedJobId} 
          onClose={() => setSelectedJobId(null)} 
        />
      )}
    </>
  )
}

