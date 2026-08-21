import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma.js'
import { DEMO_STAGES, DEMO_USERS, DEMO_VILLAGES } from './seed-data.js'

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

  for (const nomorRw of village.rws) {
    await prisma.rw.upsert({
      where: { desaId_nomorRw: { desaId: desa.id, nomorRw } },
      update: { isActive: true },
      create: { desaId: desa.id, nomorRw, isActive: true },
    })
  }
}

for (const stage of DEMO_STAGES) {
  await prisma.tahapan.upsert({
    where: { namaTahapan: stage.name },
    update: {
      requiresNomorPerangkat: stage.requiresDeviceNumber,
      instruksiDokumentasi: stage.instruction,
      isActive: true,
    },
    create: {
      namaTahapan: stage.name,
      requiresNomorPerangkat: stage.requiresDeviceNumber,
      instruksiDokumentasi: stage.instruction,
      isActive: true,
    },
  })
}

for (const user of DEMO_USERS) {
  await prisma.user.upsert({
    where: { username: user.username },
    update: { nama: user.name, role: user.role, wajibLapor: user.wajibReport, isActive: true, passwordHash: passwordHashes[user.role] },
    create: { nama: user.name, username: user.username, role: user.role, wajibLapor: user.wajibReport, isActive: true, passwordHash: passwordHashes[user.role] },
  })
}

await prisma.$disconnect()
console.log('Seed data berhasil disiapkan.')
