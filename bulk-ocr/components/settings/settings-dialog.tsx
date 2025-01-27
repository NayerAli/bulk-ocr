"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings } from "lucide-react"
import { OCRSettings } from "./ocr-settings"
import { ProcessingSettings } from "./processing-settings"
import { UploadSettings } from "./upload-settings"
import { DisplaySettings } from "./display-settings"

export function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure the OCR processing system settings.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="ocr" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ocr">OCR</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>
          <TabsContent value="ocr">
            <OCRSettings />
          </TabsContent>
          <TabsContent value="processing">
            <ProcessingSettings />
          </TabsContent>
          <TabsContent value="upload">
            <UploadSettings />
          </TabsContent>
          <TabsContent value="display">
            <DisplaySettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

