"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Copy, Download } from "lucide-react"

interface DocumentViewerProps {
  documentId: string
}

export function DocumentViewer({ documentId }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const totalPages = 612 // This would come from your backend

  const handlePageChange = (page: number) => {
    setLoading(true)
    setCurrentPage(page)
    // Simulate page load
    setTimeout(() => setLoading(false), 500)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText("Sample text")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob(["Sample text"], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `document-${documentId}-page-${currentPage}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">PDF Preview</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={currentPage.toString()} onValueChange={(value) => handlePageChange(Number.parseInt(value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Page {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Card className="aspect-[3/4] relative">
          {loading ? (
            <Skeleton className="absolute inset-0 rounded-lg" />
          ) : (
            <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center">
              PDF Preview for page {currentPage}
            </div>
          )}
        </Card>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Extracted Text</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleCopy} title={copied ? "Copied!" : "Copy to clipboard"}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload} title="Download as text file">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Card className="h-[calc(100vh-16rem)]">
          <ScrollArea className="h-full rounded-lg p-4">
            <div className="prose prose-sm max-w-none" dir="auto">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[95%]" />
                  <Skeleton className="h-4 w-[85%]" />
                </div>
              ) : (
                `مرحباً بكم في نظام التعرف الضوئي على الحروف. هذا مثال على النص العربي المستخرج من ملف PDF.

                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

                مرحباً بكم في نظام التعرف الضوئي على الحروف. هذا مثال على النص العربي المستخرج من ملف PDF.`
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}

