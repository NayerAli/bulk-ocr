"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import type { ProcessingJob } from "@/lib/types"

interface DocumentViewerProps {
  job: ProcessingJob
  isOpen: boolean
  onClose: () => void
}

export function DocumentViewer({ job, isOpen, onClose }: DocumentViewerProps) {
  const [isCopying, setIsCopying] = useState(false)

  const handleCopy = async () => {
    if (!job.text) return
    
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(job.text)
      toast.success("Text copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy text")
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{job.fileName}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!job.text || isCopying}
            >
              <Copy className="h-4 w-4 mr-2" />
              {isCopying ? "Copying..." : "Copy Text"}
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4 border rounded-md">
          {job.text ? (
            <pre className="whitespace-pre-wrap font-mono text-sm">{job.text}</pre>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No processed text available for this document
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 