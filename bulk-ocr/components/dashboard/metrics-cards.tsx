"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMetrics } from "@/lib/services/metrics-service"
import { formatFileSize } from "@/lib/utils"
import { Activity, BarChart, Clock, Cpu, FileText, Layers, Timer, TrendingUp } from "lucide-react"

export function MetricsCards() {
  const metrics = useMetrics((state) => state.metrics)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.processing.activeJobs} active</div>
          <div className="text-xs text-muted-foreground">{metrics.processing.throughput.toFixed(1)} pages/min</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Load</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.performance.cpuUsage.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">{formatFileSize(metrics.performance.memoryUsage)} RAM</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(metrics.processing.averageTimePerPage / 1000).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">per page average</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(metrics.quality.averageConfidence * 100).toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">confidence score</div>
        </CardContent>
      </Card>
    </div>
  )
}

