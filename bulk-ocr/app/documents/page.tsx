"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/stores/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, AlertCircle, Activity, ArrowLeft, Eye, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatFileSize, formatDate } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"

export default function DocumentsPage() {
  const { 
    jobs, 
    isInitialized,
    isLoading,
    error,
    initialize,
    removeJob 
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
          <p className="text-lg font-medium">Loading documents...</p>
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

  // Get completed documents
  const completedDocs = jobs
    .filter((job) => job.status === "completed")
    .sort((a, b) => {
      const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      return bDate - aDate;
    })

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

  const handleDeleteDocument = async (jobId: string) => {
    try {
      await removeJob(jobId)
      toast.success("Document deleted successfully")
    } catch (error) {
      toast.error("Failed to delete document")
      console.error("Delete error:", error)
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            View and manage your processed documents
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Return to Upload
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Processed Documents</span>
            <span className="text-sm font-normal text-muted-foreground">
              {completedDocs.length} {completedDocs.length === 1 ? 'document' : 'documents'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {completedDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No processed documents yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload documents to start processing</p>
                <Link href="/" className="mt-4">
                  <Button variant="outline">Upload Documents</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {completedDocs.map((doc) => (
                  <Link 
                    key={doc.id} 
                    href={`/documents/${doc.id}`}
                    className="group block"
                  >
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 group-hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors">{doc.fileName}</p>
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(doc.fileSize || 0)}</span>
                            <span>•</span>
                            <span>{doc.totalPages} {doc.totalPages === 1 ? 'page' : 'pages'}</span>
                            <span>•</span>
                            <span>{doc.completedAt ? formatDate(new Date(doc.completedAt).getTime()) : 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExportText(doc.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                          title="Download extracted text"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link
                          href={`/documents/${doc.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
                            title="Preview document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.preventDefault()}
                              className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{doc.fileName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteDocument(doc.id);
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <div className="text-muted-foreground/50 group-hover:text-accent-foreground transition-colors">
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
