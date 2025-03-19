// Simple script to help with GitHub Pages deployment
const fs = require("fs")
const path = require("path")

// Create .nojekyll file in the dist folder
const distDir = path.resolve(__dirname, "dist")
const nojekyllPath = path.join(distDir, ".nojekyll")

if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run "npm run build" first.')
  process.exit(1)
}

fs.writeFileSync(nojekyllPath, "")
console.log("Created .nojekyll file in dist directory")

// Copy index.html to 404.html for client-side routing
const indexPath = path.join(distDir, "index.html")
const notFoundPath = path.join(distDir, "404.html")

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath)
  console.log("Created 404.html from index.html for client-side routing")
} else {
  console.error("index.html not found in dist directory")
}

console.log("Deployment preparation complete!")

