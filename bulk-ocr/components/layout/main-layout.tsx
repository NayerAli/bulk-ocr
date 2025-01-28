"use client"

import Link from "next/link"
import { FileText, Settings, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { ThemeToggle } from "@/components/theme-toggle"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">OCR System</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/documents">Documents</Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SettingsDialog />
            <Button variant="outline" size="icon" asChild>
              <Link href="https://github.com/yourusername/your-repo" target="_blank">
                <Github className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-background">
        <div className="container flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <FileText className="h-4 w-4" />
              <span>OCR System</span>
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Your Company. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
} 