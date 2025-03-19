"use client"

import { useState, useEffect } from "react"
import { format, parseISO, startOfWeek, startOfMonth, subWeeks, isWithinInterval } from "date-fns"
import Papa from "papaparse"
import { BarChart, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, Area, ResponsiveContainer } from "recharts"
import "./App.css"

// This URL can be changed for deployment
const CSV_URL =
  "https://www.dropbox.com/scl/fi/hgkaw5kd1rr7clqfk52wd/Running-information-Running-Data-2.csv?rlkey=xtqgcbeupqma56m440otdmjsm&st=qd205nfn&dl=0"

function App() {
  const [runData, setRunData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light")

  // Set theme on load and when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Fetch CSV data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data from:", CSV_URL)
        const response = await fetch(CSV_URL)

        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
        }

        const csvText = await response.text()
        console.log("CSV data received, length:", csvText.length)

        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            console.log("Parsed data:", results.data.length, "rows")
            // Filter out rows with empty Date or Run values
            const validData = results.data
              .filter((row) => row.Date && row.Run)
              .map((row) => ({
                ...row,
                Date: row.Date,
                Run: Number.parseFloat(row.Run) || 0,
                Time: row.Time || "",
                "Avg HR": row["Avg HR"] || "",
                RPE: row.RPE || "",
                Notes: row.Notes || "",
              }))
              .sort((a, b) => {
                // Sort by date descending
                return new Date(b.Date).getTime() - new Date(a.Date).getTime()
              })

            console.log("Valid data:", validData.length, "rows")
            setRunData(validData)
            setLoading(false)
          },
          error: (error) => {
            console.error("Error parsing CSV:", error)
            setError(`Error parsing CSV: ${error.message}`)
            setLoading(false)
          },
        })
      } catch (error) {
        console.error("Error fetching CSV:", error)
        setError(`Error fetching CSV: ${error.message}`)
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
        try {
          const runDate = parseISO(run.Date)
          return runDate >= startOfCurrentWeek && runDate <= now
        } catch (e) {
          console.error("Date parsing error:", e, "for date:", run.Date)
          return false
        }
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
        try {
          const runDate = parseISO(run.Date)
          return runDate >= startOfCurrentMonth && runDate <= now
        } catch (e) {
          console.error("Date parsing error:", e, "for date:", run.Date)
          return false
        }
      })
      .reduce((total, run) => total + Number.parseFloat(run.Run), 0)
      .toFixed(2)
  }

  // Calculate weekly progress data
  const calculateWeeklyProgressData = () => {
    if (!runData.length) return []

    const now = new Date()

    const weeklyData = []
    for (let i = 0; i < 4; i++) {
      const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i)
      const weekEnd = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i - 1)
      weekEnd.setDate(weekEnd.getDate() - 1)

      const weekDistance = runData
        .filter((run) => {
          try {
            const runDate = parseISO(run.Date)
            return isWithinInterval(runDate, { start: weekStart, end: weekEnd })
          } catch (e) {
            console.error("Date parsing error:", e, "for date:", run.Date)
            return false
          }
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
          try {
            const runDate = parseISO(run.Date)
            return (
              runDate.getDate() === date.getDate() &&
              runDate.getMonth() === date.getMonth() &&
              runDate.getFullYear() === date.getFullYear()
            )
          } catch (e) {
            console.error("Date parsing error:", e, "for date:", run.Date)
            return false
          }
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
  const calculatePace = (distance, time) => {
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
    <div className="app">
      <header className="header">
        <h1>Running Dashboard</h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="main">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your running data...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <h2>Error Loading Data</h2>
            <p>{error}</p>
            <p>Please check the console for more details.</p>
          </div>
        ) : (
          <>
            <div className="metrics-grid">
              <div className="card">
                <div className="card-header">
                  <div className="card-description">Weekly Distance</div>
                  <div className="card-title">{weeklyDistance} km</div>
                </div>
                <div className="card-content">
                  <div className="card-meta">
                    <span className="icon">📊</span>
                    <span className="meta-text">Current week</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-description">Monthly Distance</div>
                  <div className="card-title">{monthlyDistance} km</div>
                </div>
                <div className="card-content">
                  <div className="card-meta">
                    <span className="icon">📅</span>
                    <span className="meta-text">Current month</span>
                  </div>
                </div>
              </div>

              <div className="card goal-card">
                <div className="card-header">
                  <div className="card-description">Weekly Goal Progress</div>
                  <div className="card-title">{weeklyDistance} / 30 km</div>
                </div>
                <div className="card-content">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min((Number.parseFloat(weeklyDistance) / 30) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="card-meta">
                    <span className="icon">📈</span>
                    <span className="meta-text">
                      {((Number.parseFloat(weeklyDistance) / 30) * 100).toFixed(0)}% of weekly goal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Weekly Progress</div>
                </div>
                <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyProgressData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="distance" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Current Week</div>
                </div>
                <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyDistanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="distance"
                        stroke="var(--primary-color)"
                        fill="var(--primary-color)"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card runs-table-card">
              <div className="card-header">
                <div className="card-title">Recent Runs</div>
              </div>
              <div className="card-content">
                <div className="table-container">
                  <table className="runs-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Distance (km)</th>
                        <th>Time</th>
                        <th>Pace</th>
                        <th>Avg HR</th>
                        <th>RPE</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runData.slice(0, 10).map((run, index) => (
                        <tr key={index}>
                          <td>{format(parseISO(run.Date), "dd MMM yyyy")}</td>
                          <td>{run.Run}</td>
                          <td>{run.Time || "-"}</td>
                          <td>{calculatePace(run.Run, run.Time)}</td>
                          <td>{run["Avg HR"] || "-"}</td>
                          <td>{run.RPE || "-"}</td>
                          <td className="notes-cell">{run.Notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>Running Dashboard • Update CSV URL in the code to use your own data</p>
      </footer>
    </div>
  )
}

export default App

