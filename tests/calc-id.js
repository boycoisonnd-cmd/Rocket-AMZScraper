import crypto from 'crypto'
import path from 'path'

function getExtensionId(dirPath) {
  // Normalize path as Chromium does on Windows: uppercase drive letter or exact path
  const absolutePath = path.resolve(dirPath)
  // On Windows, Chrome normalizes path
  const hash = crypto.createHash('sha256').update(absolutePath, 'utf8').digest('hex')
  const id = hash
    .slice(0, 32)
    .split('')
    .map((c) => String.fromCharCode(parseInt(c, 16) + 'a'.charCodeAt(0)))
    .join('')
  return id
}

const distPath = path.resolve('dist')
console.log('Dist path:', distPath)
console.log('Predicted Extension ID:', getExtensionId(distPath))
