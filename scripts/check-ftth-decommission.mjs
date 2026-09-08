import { loadLocalEnv } from '../backend/local-env.js'

loadLocalEnv(process.cwd())
const { readMigrationConfig } = await import('../backend/src/config/env.js')
const { prisma } = await import('../backend/src/config/prisma.js')

const sources = readMigrationConfig()
const entities = ['user', 'desa', 'cluster', 'pekerjaan', 'kategoriPekerjaan', 'laporan', 'dokumentasi', 'ftthIdentity']
const records = {}
for (const entity of entities) records[entity] = await prisma[entity].count()
const journal = await prisma.ftthUpload.groupBy({ by: ['state'], _count: { _all: true } })
const journalByState = Object.fromEntries(journal.map((item) => [item.state, item._count._all]))
const pendingJournal = journal.filter((item) => item.state !== 'SYNCED').reduce((total, item) => total + item._count._all, 0)
const fullFtth = process.env.FTTH_AUTH_SOURCE === 'ftth' && Object.values(sources).every((source) => source === 'ftth')

console.log(JSON.stringify({
  mode: fullFtth ? 'ftth-direct-identity' : 'mixed', sources, records,
  uploadJournal: { byState: journalByState, pending: pendingJournal },
  legacyDataStillPresent: Object.values(records).some((count) => count > 0),
  preflightPassed: fullFtth && pendingJournal === 0,
  destructiveCleanupAuthorized: false,
  requiresExplicitApproval: true,
  cleanupAction: 'review backup, retention, and rollback before deleting local Supabase data',
}, null, 2))
await prisma.$disconnect()
