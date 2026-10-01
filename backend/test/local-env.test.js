import { describe, it, expect } from 'vitest'
import { assertLocalTargets, loadLocalEnv } from '../local-env.js'
import { readMigrationConfig } from '../src/config/env.js'
describe('local environment isolation', () => {
  const local = { DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', SUPABASE_URL: 'http://127.0.0.1:54321' }
  it('accepts loopback database and storage', () => { expect(() => assertLocalTargets(local)).not.toThrow() })
  it.each(['DATABASE_URL', 'SUPABASE_URL'])('rejects remote %s', (key) => {
    expect(() => assertLocalTargets({ ...local, [key]: key === 'DATABASE_URL' ? 'postgresql://user:pass@db.example.com/postgres' : 'https://cloud.supabase.co' })).toThrow('remote ditolak')
  })
  it('never falls back to old env if local env is missing', () => {
    expect(() => loadLocalEnv('/missing-local-configuration-test')).toThrow('Tidak memakai .env lama')
  })
  it('keeps migration sources local unless explicitly switched', () => {
    expect(readMigrationConfig({})).toEqual({ master: 'local', users: 'local', reports: 'local', documentation: 'local' })
    expect(readMigrationConfig({ FTTH_MIGRATION_MASTER_SOURCE: 'ftth', FTTH_MIGRATION_REPORTS_SOURCE: 'invalid' })).toEqual({ master: 'ftth', users: 'local', reports: 'local', documentation: 'local' })
  })
})
