"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Download, Check, ChevronLeft, ChevronRight } from "lucide-react"

interface TextViewerProps {
  text: string
  fileName: string
  pageCount: number
}

export function TextViewer({ text, fileName, pageCount }: TextViewerProps) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [copied, setCopied] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"text" | "side-by-side">("text")

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName.replace(".pdf", "")}-extracted.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">{fileName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {pageCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleCopy} title={copied ? "Copied!" : "Copy to clipboard"}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload} title="Download as text file">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="text" onClick={() => setViewMode("text")}>
              Text Only
            </TabsTrigger>
            <TabsTrigger value="side-by-side" onClick={() => setViewMode("side-by-side")}>
              Side by Side
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <div className="relative">
              <ScrollArea className="h-[600px] rounded-md border bg-muted p-4">
                <div className="prose prose-sm max-w-none dark:prose-invert" dir="auto">
                  {text || "No text extracted yet"}
                </div>
              </ScrollArea>
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="side-by-side">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <div className="aspect-[3/4] rounded-md border bg-muted">
                  {/* PDF Preview would go here */}
                  <div className="flex h-full items-center justify-center text-muted-foreground">PDF Preview</div>
                </div>
              </div>
              <ScrollArea className="h-[600px] rounded-md border bg-muted p-4">
                <div className="prose prose-sm max-w-none dark:prose-invert" dir="auto">
                  {text || "No text extracted yet"}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

