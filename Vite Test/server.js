import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_DIR = fileURLToPath(new URL('./dist/', import.meta.url))
const PORT = process.env.PORT || 8080

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

async function readFileSafe(path) {
  try {
    return await readFile(path)
  } catch {
    return null
  }
}

function resolveRequestPath(url) {
  const decoded = decodeURIComponent(url.split('?')[0])
  const safe = normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  return join(DIST_DIR, safe)
}

async function resolveFile(url) {
  const requestedPath = resolveRequestPath(url)
  const requestedFile = await readFileSafe(requestedPath)
  if (requestedFile) return { path: requestedPath, content: requestedFile }

  const fallbackPath = join(DIST_DIR, 'index.html')
  const fallbackFile = await readFileSafe(fallbackPath)
  if (fallbackFile) return { path: fallbackPath, content: fallbackFile }

  return null
}

createServer(async (req, res) => {
  const resolved = await resolveFile(req.url)

  if (!resolved) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const ext = extname(resolved.path)
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' })
  res.end(resolved.content)
}).listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
