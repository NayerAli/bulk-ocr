import { DocumentViewer } from "@/components/document-viewer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function DocumentPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/documents">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">large-document.pdf</h1>
              <p className="text-sm text-muted-foreground">612 pages</p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 container mx-auto py-8 px-4">
        <DocumentViewer documentId={params.id} />
      </div>
    </div>
  )
}

