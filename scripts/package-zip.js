import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const distDir = path.resolve('dist')
const zipFile = path.resolve('r-amzscraper.zip')
const oldZip = path.resolve('rocket-amz-scraper.zip')

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.')
  process.exit(1)
}

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile)
}
if (fs.existsSync(oldZip)) {
  fs.unlinkSync(oldZip)
}

console.log('Compressing dist directory into r-amzscraper.zip...')
// Use PowerShell Compress-Archive on Windows
execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFile}' -Force"`)
console.log(`Success! Package created at: ${zipFile}`)
