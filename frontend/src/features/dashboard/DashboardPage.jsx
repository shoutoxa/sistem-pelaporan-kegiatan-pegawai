import { useCallback, useEffect, useState } from "react";
import { dashboardApi } from "../../api/dashboard.js";
import PageHeader from "../../components/PageHeader.jsx";
import PageState from "../../components/PageState.jsx";
import Icon from "../../components/Icon.jsx";

const POLL_MS = 30_000;

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const refresh = useCallback(() => {
    setState((current) => (current === "ready" ? "refreshing" : "loading"));
    return dashboardApi
      .get(date)
      .then((response) => {
        setData(response.data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [date]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);
  if (state === "loading" && !data)
    return (
      <section className="page">
        <PageState
          title="Menyiapkan dashboard"
          message="Mengambil ringkasan laporan terbaru."
        />
      </section>
    );
  if (state === "error" && !data)
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Dashboard tidak dapat dimuat"
          message="Periksa koneksi server, lalu coba kembali."
          action={
            <button className="secondary-button" onClick={refresh}>
              Coba lagi
            </button>
          }
        />
      </section>
    );

  const highestVillage = Math.max(
    1,
    ...(data?.distribusiDesa || []).map((item) => item.jumlah),
  );
  const highestStage = Math.max(
    1,
    ...(data?.distribusiTahapan || []).map((item) => item.jumlah),
  );

  return (
    <section className="page dashboard-page">
      <PageHeader
        title="Dashboard"
        description="Pantau kepatuhan pelaporan dan aktivitas lapangan pada tanggal yang dipilih."
        action={
          <div className="dashboard-controls">
            <label htmlFor="dashboard-date" className="sr-only">
              Tanggal dashboard
            </label>
            <span className="date-control">
              <Icon name="calendar" />
              <input
                id="dashboard-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </span>
            <button
              className="secondary-button icon-label"
              onClick={refresh}
              disabled={state === "refreshing"}
            >
              <Icon name="refresh" />
              {state === "refreshing" ? "Memuat..." : "Muat ulang"}
            </button>
          </div>
        }
      />
      <div className="activity-frame">
        <div className="activity-rail" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <section className="metric-band" aria-label="Ringkasan laporan">
          <article>
            <span>Pegawai wajib lapor</span>
            <strong>{data?.wajibLapor ?? 0}</strong>
            <small>pegawai aktif</small>
          </article>
          <article>
            <span>Sudah melapor</span>
            <strong className="success-value">{data?.sudahMelapor ?? 0}</strong>
            <small>pegawai terkonfirmasi</small>
          </article>
          <article>
            <span>Belum melapor</span>
            <strong className="signal-value">{data?.belumMelapor ?? 0}</strong>
            <small>perlu ditindaklanjuti</small>
          </article>
          <article>
            <span>Jumlah laporan</span>
            <strong>{data?.jumlahLaporan ?? 0}</strong>
            <small>kegiatan tercatat</small>
          </article>
        </section>
        <div className="dashboard-grid">
          <article className="data-section">
            <div className="section-heading">
              <div>
                <h2>Distribusi berdasarkan Desa</h2>
                <p>Jumlah laporan per wilayah.</p>
              </div>
            </div>
            <ul className="distribution-list">
              {(data?.distribusiDesa || []).map((item) => (
                <li key={item.namaDesa}>
                  <div>
                    <span>{item.namaDesa}</span>
                    <span className="distribution-track">
                      <i
                        style={{
                          width: `${Math.max(8, (item.jumlah / highestVillage) * 100)}%`,
                        }}
                      />
                    </span>
                  </div>
                  <strong>{item.jumlah}</strong>
                </li>
              ))}
              {!data?.distribusiDesa?.length && (
                <li className="empty-state">
                  Belum ada laporan untuk tanggal ini.
                </li>
              )}
            </ul>
          </article>
          <article className="data-section">
            <div className="section-heading">
              <div>
                <h2>Distribusi berdasarkan Tahapan</h2>
                <p>Aktivitas yang paling banyak dikerjakan.</p>
              </div>
            </div>
            <ul className="distribution-list">
              {(data?.distribusiTahapan || []).map((item) => (
                <li key={item.namaTahapan}>
                  <div>
                    <span>{item.namaTahapan}</span>
                    <span className="distribution-track">
                      <i
                        style={{
                          width: `${Math.max(8, (item.jumlah / highestStage) * 100)}%`,
                        }}
                      />
                    </span>
                  </div>
                  <strong>{item.jumlah}</strong>
                </li>
              ))}
              {!data?.distribusiTahapan?.length && (
                <li className="empty-state">
                  Belum ada tahapan yang dilaporkan.
                </li>
              )}
            </ul>
          </article>
        </div>
        <section className="data-section latest-reports">
          <div className="section-heading">
            <div>
              <h2>Laporan terbaru</h2>
              <p>Aktivitas yang terakhir masuk pada tanggal ini.</p>
            </div>
            <a className="text-link" href="/admin/laporan">
              Lihat semua <Icon name="chevronRight" size={17} />
            </a>
          </div>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Laporan terbaru</caption>
              <thead>
                <tr>
                  <th>Tahapan</th>
                  <th>Lokasi</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(data?.terbaru || []).slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.tahapan?.namaTahapan || "-"}</td>
                    <td>
                      {item.rw?.desa?.namaDesa || "-"} ·{" "}
                      {item.rw?.nomorRw || "-"}
                    </td>
                    <td className="description-cell">
                      {item.keterangan || "-"}
                    </td>
                    <td>
                      <a
                        className="table-link"
                        href={`/admin/laporan/${item.id}`}
                      >
                        Detail
                      </a>
                    </td>
                  </tr>
                ))}
                {!data?.terbaru?.length && (
                  <tr>
                    <td className="empty-cell" colSpan="4">
                      Belum ada laporan terbaru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
