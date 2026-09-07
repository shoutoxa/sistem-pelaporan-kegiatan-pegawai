// Explicit opt-in: uploads ONE synthetic PNG to the FTTH development API.
import '../backend/load-env.js'
import { createFtthClient } from '../backend/src/modules/integration/ftth.client.js'
import { ftthFileUrl } from '../backend/src/modules/integration/ftth-report.service.js'
if (process.env.APP_ENV !== 'local' || !process.argv.includes('--upload-synthetic-file')) throw new Error('Requires local mode and --upload-synthetic-file. This writes to FTTH development.')
const file = { originalname: 'codex-development-smoke.png', mimetype: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64') }
const result = await createFtthClient().uploadAttachment(file)
const uploaded = result?.data ?? result
const url = ftthFileUrl(uploaded?.file_url)
if (!url) throw new Error('Unexpected remote upload path. Do not retry automatically.')
console.log(JSON.stringify({ upload: true, file_url: uploaded.file_url, mime_type: uploaded.mime_type, file_size: uploaded.file_size }))
const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) })
const equal = response.ok && Buffer.from(await response.arrayBuffer()).equals(file.buffer)
console.log(JSON.stringify({ unauthenticatedAccess: response.status, bytesMatch: equal }))
if (!equal) process.exitCode = 1
// No delete-binary endpoint is documented. Keep the path for manual cleanup by FTTH admin.
