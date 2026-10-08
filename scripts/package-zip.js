import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const distDir = path.resolve('dist')
const zipFile = path.resolve('rocket-amz-scraper.zip')

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.')
  process.exit(1)
}

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile)
}

console.log('Compressing dist directory into rocket-amz-scraper.zip...')
// Use PowerShell Compress-Archive on Windows
execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFile}' -Force"`)
console.log(`Success! Package created at: ${zipFile}`)
