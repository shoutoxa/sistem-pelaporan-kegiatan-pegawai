export const DEMO_VILLAGES = [
  { name: 'Dewasari', rws: ['RW 01', 'RW 02'] },
  { name: 'Handapherang', rws: ['RW 01', 'RW 02'] },
  { name: 'Kertasari', rws: ['RW 01', 'RW 02'] },
  { name: 'Pamalayan', rws: ['RW 01', 'RW 02'] },
]

export const DEMO_STAGES = [
  { name: 'Absensi Mulai (Lengkap APD)', requiresDeviceNumber: false, instruction: 'Foto kondisi awal kegiatan.' },
  { name: 'Penggalian Lubang', requiresDeviceNumber: true, instruction: 'Foto lubang dan nomor perangkat.' },
  { name: 'Penanaman Tiang', requiresDeviceNumber: true, instruction: 'Foto tiang yang ditanam.' },
  { name: 'Pengecoran Tiang', requiresDeviceNumber: true, instruction: 'Foto proses pengecoran.' },
  { name: 'Penarikan Kabel FO', requiresDeviceNumber: true, instruction: 'Foto jalur penarikan kabel FO.' },
  { name: 'Pemasangan ODN', requiresDeviceNumber: true, instruction: 'Foto perangkat ODN.' },
  { name: 'Penarikan Kabel DW', requiresDeviceNumber: true, instruction: 'Foto jalur penarikan kabel DW.' },
  { name: 'Pemasangan HB & Splicing', requiresDeviceNumber: true, instruction: 'Foto HB dan hasil splicing.' },
  { name: 'Pemasangan X-Frame', requiresDeviceNumber: true, instruction: 'Foto X-Frame terpasang.' },
  { name: 'Pemasangan JC & Splicing', requiresDeviceNumber: true, instruction: 'Foto JC dan hasil splicing.' },
  { name: 'Perapihan', requiresDeviceNumber: false, instruction: 'Foto hasil akhir yang rapi.' },
]

export const DEMO_USERS = [
  { name: 'Superadmin Demo', username: 'superadmin', role: 'SUPERADMIN', wajibReport: false },
  { name: 'Pegawai Dewasari', username: 'pegawai.dewasari', role: 'PEGAWAI', wajibReport: true },
  { name: 'Pegawai Handapherang', username: 'pegawai.handapherang', role: 'PEGAWAI', wajibReport: true },
  { name: 'Pegawai Kertasari', username: 'pegawai.kertasari', role: 'PEGAWAI', wajibReport: true },
  { name: 'Pegawai Pamalayan', username: 'pegawai.pamalayan', role: 'PEGAWAI', wajibReport: true },
]
