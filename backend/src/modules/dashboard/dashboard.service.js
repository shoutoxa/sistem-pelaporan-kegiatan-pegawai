function dateValue(date) { return new Date(`${date}T00:00:00.000Z`) }

export function createDashboardService({ prisma, clock = () => new Date() }) {
  return {
    async getDashboard({ date } = {}) {
      const selectedDate = date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(clock())
      const [users, reports] = await Promise.all([
        prisma.user.findMany({ where: { role: 'PEGAWAI', isActive: true, wajibLapor: true }, select: { id: true, nama: true } }),
        prisma.laporan.findMany({ where: { tanggalKegiatan: dateValue(selectedDate) }, include: { rw: { include: { desa: true } }, tahapan: true }, orderBy: { createdAt: 'desc' } }),
      ])
      const reportedIds = new Set(reports.map((report) => report.userId))
      const byDesa = new Map()
      const byTahapan = new Map()
      for (const report of reports) {
        const desa = report.rw?.desa?.namaDesa || 'Tanpa Desa'
        const tahapan = report.tahapan?.namaTahapan || 'Tanpa Tahapan'
        byDesa.set(desa, (byDesa.get(desa) || 0) + 1)
        byTahapan.set(tahapan, (byTahapan.get(tahapan) || 0) + 1)
      }
      const belumMelaporUsers = users.filter((user) => !reportedIds.has(user.id)).map((user) => ({ id: user.id, nama: user.nama }))
      return {
        tanggal: selectedDate,
        wajibLapor: users.length,
        sudahMelapor: reportedIds.size,
        belumMelapor: belumMelaporUsers.length,
        belumMelaporUsers,
        jumlahLaporan: reports.length,
        distribusiDesa: [...byDesa.entries()].map(([namaDesa, jumlah]) => ({ namaDesa, jumlah })),
        distribusiTahapan: [...byTahapan.entries()].map(([namaTahapan, jumlah]) => ({ namaTahapan, jumlah })),
        terbaru: reports.slice(0, 10),
      }
    },
  }
}
