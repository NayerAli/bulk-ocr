"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMetrics } from "@/lib/services/metrics-service"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PerformanceCharts() {
  const [timeframe, setTimeframe] = useState<"hour" | "day" | "week">("hour")
  const getHistoricalData = useMetrics((state) => state.getHistoricalData)

  const data = getHistoricalData(timeframe)

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Metrics</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={timeframe === "hour" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe("hour")}
            >
              1H
            </Button>
            <Button variant={timeframe === "day" ? "default" : "outline"} size="sm" onClick={() => setTimeframe("day")}>
              24H
            </Button>
            <Button
              variant={timeframe === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe("week")}
            >
              7D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Line type="monotone" dataKey="processing.throughput" name="Throughput" stroke="#8884d8" />
              <Line type="monotone" dataKey="quality.averageConfidence" name="Quality" stroke="#82ca9d" />
              <Line type="monotone" dataKey="performance.cpuUsage" name="CPU Usage" stroke="#ffc658" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

