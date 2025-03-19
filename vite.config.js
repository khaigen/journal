import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Make sure this matches your GitHub repository name exactly
  // If your repository is at https://username.github.io/running-dashboard/
  // then the base should be '/running-dashboard/'
  // If it's at the root (https://username.github.io/), use '/'
  base: "./",
})

