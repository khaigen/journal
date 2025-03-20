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
})

// Check for saved theme preference
if (localStorage.getItem("theme") === "light") {
  document.body.classList.remove("dark")
}

// Fetch and parse CSV data
async function fetchRunningData() {
  try {
    const response = await fetch("running-data.csv")
    const csvText = await response.text()
    return parseCSV(csvText)
  } catch (error) {
    console.error("Error fetching running data:", error)
    return []
  }
}

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

// Initialize weekly chart
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

  new Chart(ctx, {
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

// Initialize history chart
function initHistoryChart(data) {
  const ctx = document.getElementById("history-chart").getContext("2d")

  const labels = data.map((week) => {
    const date = week.weekStart
    return `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}`
  })

  const distances = data.map((week) => week.totalDistance)

  new Chart(ctx, {
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

