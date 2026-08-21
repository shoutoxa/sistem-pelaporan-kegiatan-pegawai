import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendDir = path.dirname(fileURLToPath(import.meta.url))

// Keep one local secret file at the repository root. A backend/.env file can
// still override it when explicitly provided through the process environment.
dotenv.config({ path: path.resolve(backendDir, '../.env') })
dotenv.config({ path: path.resolve(backendDir, '.env') })
