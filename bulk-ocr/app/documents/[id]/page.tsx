"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DocumentPreview } from "@/components/document-preview"
import { useStore } from "@/lib/stores/store"
import { ProcessingJob } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function DocumentViewerPage() {
  const params = useParams()
  const [job, setJob] = useState<ProcessingJob | null>(null)
  const [extractedText, setExtractedText] = useState<{ [key: number]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const { jobs, getPageResults } = useStore()

  useEffect(() => {
    async function loadDocument() {
      if (!params.id) return
      
      // Find the job in the store
      const foundJob = jobs.find(j => j.id === params.id)
      if (foundJob) {
        setJob(foundJob)
        
        // Load page results
        const results = await getPageResults(params.id as string)
        setExtractedText(results)
      }
      
      setIsLoading(false)
    }

    loadDocument()
  }, [params.id, jobs, getPageResults])

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Document Not Found</h1>
          <p className="text-muted-foreground">
            The document you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DocumentPreview
      id={job.id}
      fileName={job.fileName}
      fileSize={job.fileSize}
      pageCount={job.totalPages}
      createdAt={job.createdAt}
      extractedText={extractedText}
    />
  )
}

