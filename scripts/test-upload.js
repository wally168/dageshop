import fs from 'fs/promises'

async function main() {
  try {
    const filePath = 'public/vercel.svg'
    const data = await fs.readFile(filePath)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const fd = new FormData()
    fd.append('file', blob, 'vercel.svg')

    const res = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: fd })
    console.log('HTTP', res.status)
    const json = await res.json()
    console.log('Response:', json)
  } catch (e) {
    console.error('Test upload failed:', e)
    process.exit(1)
  }
}

main()