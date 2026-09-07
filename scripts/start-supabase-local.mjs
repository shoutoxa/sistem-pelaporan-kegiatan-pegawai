import { spawnSync } from 'node:child_process'
const network = 'sistem-pelaporan-local'
const binding = 'com.docker.network.bridge.host_binding_ipv4'
if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('Docker belum siap. Pasang dan jalankan Docker Desktop (WSL 2), lalu coba lagi.')
  process.exit(1)
}
const existing = spawnSync('docker', ['network', 'inspect', network], { encoding: 'utf8' })
if (existing.status === 0) {
  if (JSON.parse(existing.stdout)[0]?.Options?.[binding] !== '127.0.0.1') {
    throw new Error('Network sudah ada tetapi tidak dibatasi ke localhost. Tidak memulai Supabase.')
  }
} else if (spawnSync('docker', ['network', 'create', '-o', `${binding}=127.0.0.1`, network], { stdio: 'inherit' }).status !== 0) {
  process.exit(1)
}
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'exec', '--yes', '--package=supabase@2.116.0', '--', 'supabase', 'start', '--network-id', network], { stdio: 'inherit' })
process.exitCode = result.status ?? 1
