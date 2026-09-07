import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { loadLocalEnv } from '../backend/local-env.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.APP_ENV = 'local'
loadLocalEnv(root)
const mode = process.argv[2]
const commands = {
  dev: { cwd: root, args: [process.env.npm_execpath, 'run', 'dev'] },
  migrate: { cwd: path.join(root, 'backend'), args: [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'] },
  seed: { cwd: root, args: [path.join(root, 'backend/prisma/seed.js')] },
  storage: { cwd: root, args: [path.join(root, 'scripts/local-storage.mjs')] },
}
const command = commands[mode]
if (!command || command.args.some((arg) => !arg)) throw new Error('Gunakan npm run dev:local / db:local:migrate / db:local:seed / storage:local.')
const child = spawn(process.execPath, command.args, { cwd: command.cwd, env: process.env, stdio: 'inherit' })
child.on('error', () => { console.error('Perintah lokal tidak dapat dijalankan.'); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
