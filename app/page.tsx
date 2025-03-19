"use client"

import { useEffect, useState } from "react"
import { format, parseISO, startOfWeek, startOfMonth, subWeeks, isWithinInterval } from "date-fns"
import { BarChart, Calendar, LineChart, Moon, Sun } from "lucide-react"
import Papa from "papaparse"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, ResponsiveContainer, XAxis, YAxis } from "recharts"

// This URL can be changed for deployment
const CSV_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Running%20information%20-%20Running%20Data-2-nq3Oi4dX1Xali5XlQ1R7r2grTs6YCJ.csv"

interface RunData {
  Date: string
  Run: string
  Time: string
  "Avg HR": string
  RPE: string
  Notes: string
  [key: string]: string
}

export default function RunningDashboard() {
  const [runData, setRunData] = useState<RunData[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<"dark" | "light">("light")

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(prefersDark ? "dark" : "light")
      document.documentElement.classList.toggle("dark", prefersDark)
    }
  }, [])

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    localStorage.setItem("theme", newTheme)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CSV_URL)
        const csvText = await response.text()

        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            // Filter out rows with empty Date or Run values
            const validData = results.data
              .filter((row: any) => row.Date && row.Run)
              .map((row: any) => ({
                ...row,
                Date: row.Date,
                Run: Number.parseFloat(row.Run) || 0,
                Time: row.Time || "",
                "Avg HR": row["Avg HR"] || "",
                RPE: row.RPE || "",
                Notes: row.Notes || "",
              }))
              .sort((a: any, b: any) => {
                // Sort by date descending
                return new Date(b.Date).getTime() - new Date(a.Date).getTime()
              })

            setRunData(validData as RunData[])
            setLoading(false)
          },
          error: (error) => {
            console.error("Error parsing CSV:", error)
            setLoading(false)
          },
        })
      } catch (error) {
        console.error("Error fetching CSV:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate weekly distance
  const calculateWeeklyDistance = () => {
    if (!runData.length) return 0

    const now = new Date()
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 })

    return runData
      .filter((run) => {
        const runDate = parseISO(run.Date)
        return runDate >= startOfCurrentWeek && runDate <= now
      })
      .reduce((total, run) => total + Number.parseFloat(run.Run), 0)
      .toFixed(2)
  }

  // Calculate monthly distance
  const calculateMonthlyDistance = () => {
    if (!runData.length) return 0

    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)

    return runData
      .filter((run) => {
        const runDate = parseISO(run.Date)
        return runDate >= startOfCurrentMonth && runDate <= now
      })
      .reduce((total, run) => total + Number.parseFloat(run.Run), 0)
      .toFixed(2)
  }

  // Calculate weekly progress data
  const calculateWeeklyProgressData = () => {
    if (!runData.length) return []

    const now = new Date()
    const fourWeeksAgo = subWeeks(now, 4)

    const weeklyData = []
    for (let i = 0; i < 4; i++) {
      const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i)
      const weekEnd = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i - 1)
      weekEnd.setDate(weekEnd.getDate() - 1)

      const weekDistance = runData
        .filter((run) => {
          const runDate = parseISO(run.Date)
          return isWithinInterval(runDate, { start: weekStart, end: weekEnd })
        })
        .reduce((total, run) => total + Number.parseFloat(run.Run), 0)

      weeklyData.unshift({
        week: `Week ${4 - i}`,
        distance: Number.parseFloat(weekDistance.toFixed(2)),
      })
    }

    return weeklyData
  }

  // Calculate daily distance for the current week
  const calculateDailyDistanceForWeek = () => {
    if (!runData.length) return []

    const now = new Date()
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 })

    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const dailyData = daysOfWeek.map((day, index) => {
      const date = new Date(startOfCurrentWeek)
      date.setDate(date.getDate() + index)

      const dayDistance = runData
        .filter((run) => {
          const runDate = parseISO(run.Date)
          return (
            runDate.getDate() === date.getDate() &&
            runDate.getMonth() === date.getMonth() &&
            runDate.getFullYear() === date.getFullYear()
          )
        })
        .reduce((total, run) => total + Number.parseFloat(run.Run), 0)

      return {
        day,
        distance: Number.parseFloat(dayDistance.toFixed(2)),
      }
    })

    return dailyData
  }

  // Calculate pace from distance and time
  const calculatePace = (distance: string, time: string) => {
    if (!distance || !time) return "-"

    const distanceKm = Number.parseFloat(distance)
    if (distanceKm === 0) return "-"

    const [hours, minutes, seconds] = time.split(":").map(Number)
    const totalMinutes = (hours || 0) * 60 + (minutes || 0) + (seconds || 0) / 60

    const paceMinutes = Math.floor(totalMinutes / distanceKm)
    const paceSeconds = Math.floor((totalMinutes / distanceKm - paceMinutes) * 60)

    return `${paceMinutes}:${paceSeconds.toString().padStart(2, "0")}/km`
  }

  const weeklyDistance = calculateWeeklyDistance()
  const monthlyDistance = calculateMonthlyDistance()
  const weeklyProgressData = calculateWeeklyProgressData()
  const dailyDistanceData = calculateDailyDistanceForWeek()

  return (
    <div className={`min-h-screen bg-background ${theme === "dark" ? "dark" : ""}`}>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-semibold">Running Dashboard</h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      <main className="container py-6">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            <Card className="md:col-span-2 lg:col-span-4">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Weekly Distance</CardDescription>
                  <CardTitle className="text-3xl">{weeklyDistance} km</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Current week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Monthly Distance</CardDescription>
                  <CardTitle className="text-3xl">{monthlyDistance} km</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Current month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardDescription>Weekly Goal Progress</CardDescription>
                  <CardTitle className="text-3xl">{weeklyDistance} / 30 km</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={(Number.parseFloat(weeklyDistance) / 30) * 100} className="h-2" />
                  <div className="mt-2 flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {((Number.parseFloat(weeklyDistance) / 30) * 100).toFixed(0)}% of weekly goal
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      distance: {
                        label: "Distance",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="aspect-[4/3]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyProgressData}>
                        <XAxis dataKey="week" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="distance" fill="var(--color-distance)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      distance: {
                        label: "Distance",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="aspect-[4/3]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyDistanceData}>
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="distance"
                          stroke="var(--color-distance)"
                          fill="var(--color-distance)"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Distance (km)</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Pace</TableHead>
                        <TableHead>Avg HR</TableHead>
                        <TableHead>RPE</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runData.slice(0, 10).map((run, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(parseISO(run.Date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{run.Run}</TableCell>
                          <TableCell>{run.Time || "-"}</TableCell>
                          <TableCell>{calculatePace(run.Run, run.Time)}</TableCell>
                          <TableCell>{run["Avg HR"] || "-"}</TableCell>
                          <TableCell>{run.RPE || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{run.Notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

