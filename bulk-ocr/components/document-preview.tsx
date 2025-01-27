"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Search, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatFileSize } from "@/lib/utils"

interface DocumentPreviewProps {
  id: string
  fileName: string
  fileSize: number
  pageCount: number
  createdAt: Date
  extractedText: { [key: number]: string } // Page number to text mapping
}

export function DocumentPreview({ id, fileName, fileSize, pageCount, createdAt, extractedText }: DocumentPreviewProps) {
  const [scale, setScale] = React.useState(1)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchQuery, setSearchQuery] = React.useState("")
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
  }

  const filteredText = React.useMemo(() => {
    if (!searchQuery) return extractedText[currentPage] || ""
    const text = extractedText[currentPage] || ""
    const regex = new RegExp(`(${searchQuery})`, "gi")
    return text.replace(regex, `<mark>$1</mark>`)
  }, [extractedText, currentPage, searchQuery])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">{fileName}</h1>
            {pageCount > 1 && (
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {pageCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  File Info
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>File Information</SheetTitle>
                  <SheetDescription>Details about the document</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">File Name</p>
                    <p className="text-sm text-muted-foreground">{fileName}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Size</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(fileSize)}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pages</p>
                    <p className="text-sm text-muted-foreground">{pageCount}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">{createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              Export All
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={currentPage}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value)
                    if (value >= 1 && value <= pageCount) {
                      setCurrentPage(value)
                    }
                  }}
                  className="w-20"
                />
                <Button
                  variant="outline"
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
            <Card className="overflow-hidden document-preview">
              <div
                className="aspect-[1/1.4] transition-transform duration-200 ease-in-out"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }}
              >
                <img
                  src={`/api/preview/${id}/${currentPage}`}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain"
                />
              </div>
            </Card>
          </div>

          {/* Extracted Text */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={handleExportCurrent}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <Card className="flex-1">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div
                  ref={contentRef}
                  className="p-4 prose prose-sm max-w-none"
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
