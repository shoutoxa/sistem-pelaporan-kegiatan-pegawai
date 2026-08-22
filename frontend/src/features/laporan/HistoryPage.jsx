import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { historyApi } from "../../api/history.js";
import PageHeader from "../../components/PageHeader.jsx";
import PageState from "../../components/PageState.jsx";
import Icon from "../../components/Icon.jsx";
import { masterApi } from "../../api/master.js";

export default function HistoryPage() {
  const [result, setResult] = useState({ items: [], total: 0 });
  const [state, setState] = useState("loading");
  const [filters, setFilters] = useState({
    tanggal: "",
    tahapanId: "",
    page: 1,
    limit: 20,
  });
  const [stages, setStages] = useState([]);
  useEffect(() => {
    masterApi
      .fetchTahapan()
      .then((rows) => setStages(Array.isArray(rows) ? rows : []))
      .catch(() => setStages([]));
  }, []);
  useEffect(() => {
    setState("loading");
    historyApi
      .listMine(filters)
      .then((response) => {
        setResult(response.data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [filters]);
  if (state === "loading")
    return (
      <section className="page">
        <PageState
          title="Menyiapkan histori"
          message="Mengambil laporan yang pernah Anda kirim."
        />
      </section>
    );
  if (state === "error")
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Histori tidak dapat dimuat"
          message="Periksa koneksi server, lalu muat kembali halaman."
        />
      </section>
    );
  const totalPages = Math.max(
    1,
    Math.ceil(result.total / (result.limit || filters.limit)),
  );
  return (
    <section className="page">
      <PageHeader
        title="Histori laporan"
        description="Semua kegiatan yang pernah Anda kirim tersimpan di sini."
        action={
          <Link className="primary-button icon-label" to="/pegawai/laporan/new">
            <Icon name="plus" />
            Buat laporan
          </Link>
        }
      />
      <section className="filter-bar" aria-label="Filter histori">
        <div className="filter-fields">
          <label>
            Tanggal
            <input
              aria-label="Tanggal histori"
              type="date"
              value={filters.tanggal}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tanggal: event.target.value,
                  page: 1,
                }))
              }
            />
          </label>
          <label>
            Tahapan
            <select
              aria-label="Tahapan histori"
              value={filters.tahapanId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tahapanId: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">Semua Tahapan</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.namaTahapan}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="data-section table-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar laporan</h2>
            <p>{result.total} laporan tersimpan</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Histori laporan pegawai</caption>
            <thead>
              <tr>
                <th>Kegiatan & kirim</th>
                <th>Lokasi</th>
                <th>Tahapan</th>
                <th>Perangkat</th>
                <th>Keterangan</th>
                <th>Foto</th>
                <th>Status edit</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {String(item.tanggalKegiatan).slice(0, 10)}
                    <small className="table-subline">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </small>
                  </td>
                  <td>
                    {item.rw?.desa?.namaDesa} · {item.rw?.nomorRw}
                  </td>
                  <td>
                    <strong>{item.tahapan?.namaTahapan}</strong>
                  </td>
                  <td>{item.nomorPerangkat || "-"}</td>
                  <td className="description-cell">{item.keterangan}</td>
                  <td>{item.dokumentasi?.length || 0} foto</td>
                  <td>
                    <span
                      className={`status-badge ${item.canEdit ? "active" : "inactive"}`}
                    >
                      {item.canEdit ? "Dapat diedit" : "Terkunci"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="table-link"
                        to={`/pegawai/laporan/${item.id}`}
                      >
                        Detail
                      </Link>
                      {item.canEdit && (
                        <Link
                          className="table-link"
                          to={`/pegawai/laporan/${item.id}/edit`}
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!result.items?.length && (
                <tr>
                  <td className="empty-cell" colSpan="8">
                    Belum ada laporan yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button
            className="secondary-button"
            disabled={(result.page || 1) <= 1}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page - 1 }))
            }
          >
            Sebelumnya
          </button>
          <span>
            Halaman {result.page || 1} dari {totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={(result.page || 1) >= totalPages}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page + 1 }))
            }
          >
            Berikutnya
          </button>
        </div>
      </section>
    </section>
  );
}
