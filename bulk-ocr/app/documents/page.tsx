"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Clock, ArrowUpRight, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/stores/store"
import { ProcessingJob } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { formatFileSize } from "@/lib/utils"

export default function DocumentsPage() {
  const router = useRouter()
  const { jobs } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredJobs, setFilteredJobs] = useState<ProcessingJob[]>([])

  useEffect(() => {
    const filtered = jobs
      .filter((job) => 
        job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    setFilteredJobs(filtered)
  }, [jobs, searchQuery])

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

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            View and manage your processed documents
          </p>
        </div>
        <div className="w-full md:w-64">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredJobs.map((job) => (
          <Card
            key={job.id}
            className="group p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push(`/documents/${job.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg border p-2 group-hover:border-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{job.fileName}</p>
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
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(job.fileSize)}</span>
                  <span>{job.totalPages} pages</span>
                  <span>{Math.round(job.progress)}% complete</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {searchQuery ? (
              <>
                <p className="text-muted-foreground">No documents match your search</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching with different terms
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No documents processed yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a document to get started
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

