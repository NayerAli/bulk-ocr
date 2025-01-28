"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Search, ZoomIn, ZoomOut, Copy, FileText, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatFileSize, formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface DocumentPreviewProps {
  id: string
  fileName: string
  fileSize: number
  pageCount: number
  createdAt: Date
  extractedText: { [key: number]: string }
}

export function DocumentPreview({ id, fileName, fileSize, pageCount, createdAt, extractedText }: DocumentPreviewProps) {
  const [scale, setScale] = React.useState(1)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [imageError, setImageError] = React.useState<string | null>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5))

  const handleExportAll = () => {
    const allText = Object.entries(extractedText)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([page, text]) => `Page ${page}\n\n${text}\n\n`)
      .join("---\n\n")

    const blob = new Blob([allText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName.replace(/\.[^/.]+$/, "")}-extracted.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: "Export Complete",
      description: "All pages have been exported successfully.",
    })
  }

  const handleExportCurrent = () => {
    const text = extractedText[currentPage] || ""
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName.replace(/\.[^/.]+$/, "")}-page-${currentPage}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: "Export Complete",
      description: `Page ${currentPage} has been exported successfully.`,
    })
  }

  const handleCopyText = async () => {
    const text = extractedText[currentPage] || ""
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Text Copied",
        description: "Current page text has been copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive",
      })
    }
  }

  const filteredText = React.useMemo(() => {
    if (!searchQuery) return extractedText[currentPage] || ""
    const text = extractedText[currentPage] || ""
    const regex = new RegExp(`(${searchQuery})`, "gi")
    return text.replace(regex, `<mark>$1</mark>`)
  }, [extractedText, currentPage, searchQuery])

  const matchCount = React.useMemo(() => {
    if (!searchQuery) return 0
    const text = extractedText[currentPage] || ""
    const regex = new RegExp(searchQuery, "gi")
    return (text.match(regex) || []).length
  }, [extractedText, currentPage, searchQuery])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {fileName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(fileSize)}</span>
                <span>•</span>
                <span>{pageCount} pages</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Select value={scale.toString()} onValueChange={(value) => setScale(Number.parseFloat(value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">50%</SelectItem>
                <SelectItem value="0.75">75%</SelectItem>
                <SelectItem value="1">100%</SelectItem>
                <SelectItem value="1.5">150%</SelectItem>
                <SelectItem value="2">200%</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={scale >= 2}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Document Preview */}
          <Card className="overflow-hidden document-preview">
            <div
              className="aspect-[1/1.4] transition-transform duration-200 ease-in-out relative"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
              }}
            >
              {imageError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center p-4">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{imageError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setImageError(null);
                        const img = new Image();
                        img.src = `/api/preview/${id}/${currentPage}?t=${Date.now()}`;
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <img
                  key={`${id}-${currentPage}`}
                  src={`/api/preview/${id}/${currentPage}`}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setImageError('Failed to load preview. Please try again.');
                  }}
                  onLoad={() => setImageError(null)}
                />
              )}
            </div>
          </Card>

          {/* Extracted Text */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  {searchQuery && (
                    <Badge variant="secondary" className="absolute right-2 top-2">
                      {matchCount} matches
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyText}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCurrent}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <Card className="flex-1">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div
                  ref={contentRef}
                  className="p-4 prose prose-sm max-w-none whitespace-pre-wrap font-mono"
                  dangerouslySetInnerHTML={{ __html: filteredText }}
                />
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 
