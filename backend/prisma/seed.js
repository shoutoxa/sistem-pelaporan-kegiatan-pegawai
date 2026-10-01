import '../load-env.js'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma.js'
import { DEMO_JOBS, DEMO_USERS, DEMO_VILLAGES } from './seed-data.js'

const adminPassword = process.env.SEED_ADMIN_PASSWORD
const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD

if (!adminPassword || !employeePassword) {
  throw new Error('SEED_ADMIN_PASSWORD dan SEED_EMPLOYEE_PASSWORD wajib diisi untuk menjalankan seed.')
}

const passwordHashes = {
  SUPERADMIN: await bcrypt.hash(adminPassword, 12),
  PEGAWAI: await bcrypt.hash(employeePassword, 12),
}

for (const village of DEMO_VILLAGES) {
  const desa = await prisma.desa.upsert({
    where: { namaDesa: village.name },
    update: { isActive: true },
    create: { namaDesa: village.name, isActive: true },
  })

  for (const clusterName of village.clusters) {
    await prisma.cluster.upsert({
      where: { desaId_clusterName: { desaId: desa.id, clusterName } },
      update: { isActive: true },
      create: { desaId: desa.id, clusterName, isActive: true },
    })
  }
}

for (const job of DEMO_JOBS) {
  await prisma.pekerjaan.upsert({
    where: { namaPekerjaan: job.name },
    update: {
      instruksiDokumentasi: job.instruction,
      isActive: true,
    },
    create: {
      namaPekerjaan: job.name,
      instruksiDokumentasi: job.instruction,
      isActive: true,
    },
  })
}

for (const user of DEMO_USERS) {
  await prisma.user.upsert({
    where: { username: user.username },
    update: { nama: user.name, role: user.role, wajibLapor: user.wajibReport, nomorHp: user.nomorHp, isActive: true, passwordHash: passwordHashes[user.role] },
    create: { nama: user.name, username: user.username, role: user.role, wajibLapor: user.wajibReport, nomorHp: user.nomorHp, isActive: true, passwordHash: passwordHashes[user.role] },
  })
}

await prisma.$disconnect()
console.log('Seed data berhasil disiapkan.')
