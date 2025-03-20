import { Chart } from "@/components/ui/chart"
// Global variables
let runningData = []
let weeklyData = []

// DOM elements
const weeklyDistanceEl = document.getElementById("weekly-distance")
const weeklyTimeEl = document.getElementById("weekly-time")
const runsContainerEl = document.getElementById("runs-container")
const lastUpdatedEl = document.getElementById("last-updated")
const themeToggleBtn = document.getElementById("theme-toggle")

// Theme toggle functionality
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark")
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light")

  // Refresh charts when theme changes
  if (weeklyData.length > 0) {
    initWeeklyChart(weeklyData)
    initHistoryChart(weeklyData)
  }
})

// Check for saved theme preference
if (localStorage.getItem("theme") === "light") {
  document.body.classList.remove("dark")
}

// Update the fetchRunningData function to use the raw URL of your CSV file
async function fetchRunningData() {
  try {
    // Use the direct URL to your CSV file
    const response = await fetch("running-data.csv")

    // Log the response for debugging
    console.log("CSV Response:", response)

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log("CSV Data (first 100 chars):", csvText.substring(0, 100))

    return parseCSV(csvText)
  } catch (error) {
    console.error("Error fetching running data:", error)
    // Use the embedded data as fallback
    return parseCSV(FALLBACK_CSV_DATA)
  }
}

// Add fallback data in case the CSV file can't be loaded
const FALLBACK_CSV_DATA = `Date,Distance,Minutes,Seconds,Avg Pace,Avg HR,RPE,Notes
2023-01-01,5.2,30,15,5:49,145,6,Easy run to start the year
2023-01-03,8.4,48,30,5:46,152,7,Hill repeats
2023-01-05,4.1,22,45,5:33,148,5,Recovery run
2023-01-08,12.3,72,10,5:52,155,8,Long run
2023-01-10,6.5,35,20,5:26,150,6,Tempo run
2023-01-12,5.0,28,45,5:45,146,5,Easy run
2023-01-15,14.2,85,30,6:01,158,9,Long run with hills
2023-01-17,7.3,40,15,5:31,153,7,Intervals
2023-01-19,5.5,31,40,5:45,147,6,Easy recovery
2023-01-22,16.1,98,20,6:06,156,8,Long run
2023-01-24,8.2,44,50,5:28,154,7,Tempo run
2023-01-26,6.0,34,10,5:42,149,6,Easy run
2023-01-29,18.5,114,45,6:12,160,9,Long run
2023-01-31,7.8,42,30,5:27,155,7,Speed work
2023-02-02,5.5,31,15,5:41,148,6,Recovery run
2023-02-05,20.1,125,30,6:14,162,9,Long run
2023-02-07,8.5,46,20,5:27,156,7,Tempo run
2023-02-09,6.2,35,45,5:46,150,6,Easy run
2023-02-12,15.3,92,10,6:01,158,8,Long run
2023-02-14,7.5,41,30,5:32,154,7,Intervals
2023-02-16,5.8,33,20,5:45,149,6,Recovery run
2023-02-19,21.1,132,45,6:17,163,10,Half marathon
2023-02-21,5.0,30,0,6:00,145,5,Recovery run
2023-02-23,7.2,40,10,5:35,152,6,Easy run
2023-02-26,12.5,74,30,5:58,156,7,Medium long run
2023-02-28,8.0,43,45,5:28,155,7,Tempo run
2023-03-02,6.5,37,20,5:44,151,6,Easy run
2023-03-05,22.5,140,15,6:14,165,9,Long run
2023-03-07,8.8,48,30,5:31,157,7,Speed work
2023-03-09,6.0,34,45,5:48,150,6,Recovery run
2023-03-12,16.2,98,10,6:03,159,8,Long run
2023-03-14,9.2,50,30,5:29,158,7,Tempo run
2023-03-16,7.0,40,0,5:43,152,6,Easy run
2023-03-19,24.5,155,20,6:20,167,10,Long run
2023-03-21,6.5,38,10,5:52,151,6,Recovery run
2023-03-23,8.5,47,30,5:35,156,7,Intervals
2023-03-26,18.0,110,45,6:09,160,8,Long run
2023-03-28,9.5,52,15,5:30,158,7,Tempo run
2023-03-30,7.2,41,30,5:46,153,6,Easy run
2023-04-02,20.65,126,0,6:06,162,9,Long run with negative splits
2023-04-04,8.0,44,15,5:32,155,7,Speed work
2023-04-06,6.5,37,30,5:46,151,6,Recovery run
2023-04-09,15.8,96,45,6:07,158,8,Long run
2023-04-11,9.0,49,20,5:29,157,7,Tempo run
2023-04-13,7.5,43,0,5:44,153,6,Easy run
2023-04-16,20.31,124,45,6:08,163,9,Long run
2023-04-18,6.0,35,10,5:52,150,6,Recovery run
2023-04-20,8.2,45,30,5:33,156,7,Intervals
2023-04-23,5.29,30,45,5:49,149,5,Easy run, no real pains, some niggling aches here and there, but overall easy run, no pains during social after too`

// Parse CSV text into structured data
function parseCSV(csvText) {
  const lines = csvText.split("\n")
  const headers = lines[0].split(",").map((header) => header.trim())

  return lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const values = line.split(",")
      const entry = {}

      headers.forEach((header, index) => {
        entry[header] = values[index] ? values[index].trim() : ""
      })

      return entry
    })
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return ""

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Get week number from date
function getWeekNumber(d) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

// Get week start date
function getWeekStartDate(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.setDate(diff))
}

// Calculate weekly stats
function calculateWeeklyStats(data) {
  const weekMap = new Map()

  data.forEach((run) => {
    if (!run.Date || !run.Distance) return

    const date = new Date(run.Date)
    const weekStart = getWeekStartDate(date)
    const weekKey = `${weekStart.getFullYear()}-${getWeekNumber(date)}`

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart,
        totalDistance: 0,
        totalMinutes: 0,
        runs: [],
      })
    }

    const week = weekMap.get(weekKey)
    const distance = Number.parseFloat(run.Distance) || 0
    const minutes = Number.parseInt(run.Minutes) || 0
    const seconds = Number.parseInt(run.Seconds) || 0

    week.totalDistance += distance
    week.totalMinutes += minutes + seconds / 60
    week.runs.push(run)
  })

  return Array.from(weekMap.values()).sort((a, b) => a.weekStart - b.weekStart)
}

// Format time (minutes) to hours and minutes
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

// Create a run card element
function createRunCard(run) {
  const date = new Date(run.Date)
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const card = document.createElement("div")
  card.className = "run-card"

  card.innerHTML = `
    <div class="run-card-header">
      <div class="run-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4v16"></path><path d="M17 4v16"></path><path d="M19 16H5"></path><path d="M19 8H5"></path></svg>
      </div>
      <div>
        <div class="run-card-title">Outdoor Run</div>
        <div class="run-card-date">${dayName}, ${formattedDate}</div>
      </div>
    </div>
    <div class="run-card-distance">${run.Distance} km</div>
    <div class="run-card-stats">
      <div class="run-card-stat">
        <span class="run-card-stat-label">Duration</span>
        <span class="run-card-stat-value">${run.Minutes}m ${run.Seconds}s</span>
      </div>
      <div class="run-card-stat">
        <span class="run-card-stat-label">Avg Pace</span>
        <span class="run-card-stat-value">${run["Avg Pace"]}/km</span>
      </div>
      <div class="run-card-stat">
        <span class="run-card-stat-label">Heart Rate</span>
        <span class="run-card-stat-value">${run["Avg HR"] || "N/A"} bpm</span>
      </div>
      <div class="run-card-stat">
        <span class="run-card-stat-label">RPE</span>
        <span class="run-card-stat-value">${run.RPE || "N/A"}/10</span>
      </div>
    </div>
    ${run.Notes ? `<div class="run-card-notes">${run.Notes}</div>` : ""}
  `

  return card
}

// Fix the chart initialization to handle theme changes
function initWeeklyChart(data) {
  const ctx = document.getElementById("weekly-chart").getContext("2d")

  // Get current week data
  const currentWeek = data[data.length - 1]
  const dailyData = Array(7).fill(0)
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  if (currentWeek) {
    currentWeek.runs.forEach((run) => {
      const date = new Date(run.Date)
      const dayIndex = (date.getDay() + 6) % 7 // Convert Sunday=0 to Monday=0
      dailyData[dayIndex] = Number.parseFloat(run.Distance) || 0
    })
  }

  // Check if chart already exists and destroy it
  if (window.weeklyChart) {
    window.weeklyChart.destroy()
  }

  window.weeklyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Distance (km)",
          data: dailyData,
          backgroundColor: "rgba(255, 87, 34, 0.7)",
          borderColor: "rgba(255, 87, 34, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: getComputedStyle(document.body).getPropertyValue("--chart-grid"),
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary"),
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary"),
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  })
}

// Fix the history chart initialization
function initHistoryChart(data) {
  const ctx = document.getElementById("history-chart").getContext("2d")

  const labels = data.map((week) => {
    const date = week.weekStart
    return `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}`
  })

  const distances = data.map((week) => week.totalDistance)

  // Check if chart already exists and destroy it
  if (window.historyChart) {
    window.historyChart.destroy()
  }

  window.historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Weekly Distance (km)",
          data: distances,
          fill: true,
          backgroundColor: "rgba(255, 87, 34, 0.2)",
          borderColor: "rgba(255, 87, 34, 1)",
          borderWidth: 2,
          tension: 0.1,
          pointBackgroundColor: "rgba(255, 87, 34, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: getComputedStyle(document.body).getPropertyValue("--chart-grid"),
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary"),
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--text-secondary"),
            maxRotation: 45,
            minRotation: 45,
          },
        },
      },
    },
  })
}

// Update UI with running data
function updateUI(data, weeklyData) {
  // Update weekly stats
  const currentWeek = weeklyData[weeklyData.length - 1]
  if (currentWeek) {
    weeklyDistanceEl.textContent = `${currentWeek.totalDistance.toFixed(2)} km`
    weeklyTimeEl.textContent = formatTime(currentWeek.totalMinutes)
  }

  // Update run cards
  runsContainerEl.innerHTML = ""
  const recentRuns = data
    .filter((run) => run.Distance)
    .sort((a, b) => new Date(b.Date) - new Date(a.Date))
    .slice(0, 6)

  recentRuns.forEach((run) => {
    runsContainerEl.appendChild(createRunCard(run))
  })

  // Update last updated date
  const lastRun = recentRuns[0]
  if (lastRun) {
    lastUpdatedEl.textContent = formatDate(lastRun.Date)
  }

  // Initialize charts
  initWeeklyChart(weeklyData)
  initHistoryChart(weeklyData)
}

// Initialize the application
async function init() {
  runningData = await fetchRunningData()
  weeklyData = calculateWeeklyStats(runningData)
  updateUI(runningData, weeklyData)
}

// Start the application
init()

