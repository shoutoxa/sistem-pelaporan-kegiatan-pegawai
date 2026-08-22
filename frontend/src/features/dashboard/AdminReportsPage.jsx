import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard.js";
import { exportReports } from "../../api/export.js";
import PageHeader from "../../components/PageHeader.jsx";
import Notice from "../../components/Notice.jsx";
import Icon from "../../components/Icon.jsx";
import PageState from "../../components/PageState.jsx";
import { masterApi } from "../../api/master.js";
import { http } from "../../api/http.js";

export default function AdminReportsPage() {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    pegawaiId: "",
    desaId: "",
    rwId: "",
    tahapanId: "",
    page: 1,
    limit: 20,
  });
  const [options, setOptions] = useState({
    employees: [],
    villages: [],
    rw: [],
    stages: [],
  });
  const [result, setResult] = useState({ items: [], total: 0 });
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    setState("loading");
    dashboardApi
      .listReports(filters)
      .then((response) => {
        if (active) {
          setResult(response.data);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [filters]);
  useEffect(() => {
    Promise.all([
      http.request("/api/admin/pegawai"),
      masterApi.fetchDesa(),
      masterApi.fetchTahapan(),
    ])
      .then(([employeeBody, villages, stages]) =>
        setOptions((current) => ({
          ...current,
          employees: Array.isArray(employeeBody?.data) ? employeeBody.data : [],
          villages: Array.isArray(villages) ? villages : [],
          stages: Array.isArray(stages) ? stages : [],
        })),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!filters.desaId) {
      setOptions((current) => ({ ...current, rw: [] }));
      return;
    }
    masterApi
      .fetchRwByDesa(filters.desaId)
      .then((rows) =>
        setOptions((current) => ({
          ...current,
          rw: Array.isArray(rows) ? rows : [],
        })),
      )
      .catch(() => {});
  }, [filters.desaId]);
  const [error, setError] = useState("");
  async function download() {
    setError("");
    try {
      const blob = await exportReports(filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "laporan.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message || "Ekspor gagal.");
    }
  }
  const hasFilters =
    filters.from ||
    filters.to ||
    filters.pegawaiId ||
    filters.desaId ||
    filters.rwId ||
    filters.tahapanId;
  const updateFilter = (key, value) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "desaId" ? { rwId: "" } : {}),
      page: 1,
    }));
  const totalPages = Math.max(
    1,
    Math.ceil(result.total / (result.limit || filters.limit)),
  );
  return (
    <section className="page">
      <PageHeader
        title="Laporan"
        description="Tinjau kegiatan lapangan dan unduh rekap berdasarkan periode."
        action={
          <button className="primary-button icon-label" onClick={download}>
            <Icon name="download" />
            Ekspor Excel
          </button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      <section className="filter-bar" aria-label="Filter laporan">
        <div className="filter-fields">
          <label htmlFor="filter-from">
            Dari tanggal
            <input
              id="filter-from"
              aria-label="Dari tanggal"
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
            />
          </label>
          <label htmlFor="filter-to">
            Sampai tanggal
            <input
              id="filter-to"
              aria-label="Sampai tanggal"
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
            />
          </label>
          <label>
            Pegawai
            <select
              aria-label="Pegawai"
              value={filters.pegawaiId}
              onChange={(event) =>
                updateFilter("pegawaiId", event.target.value)
              }
            >
              <option value="">Semua Pegawai</option>
              {options.employees.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desa
            <select
              aria-label="Desa"
              value={filters.desaId}
              onChange={(event) => updateFilter("desaId", event.target.value)}
            >
              <option value="">Semua Desa</option>
              {options.villages.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.namaDesa}
                </option>
              ))}
            </select>
          </label>
          <label>
            RW
            <select
              aria-label="RW"
              value={filters.rwId}
              onChange={(event) => updateFilter("rwId", event.target.value)}
              disabled={!filters.desaId}
            >
              <option value="">Semua RW</option>
              {options.rw.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.nomorRw}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tahapan
            <select
              aria-label="Tahapan"
              value={filters.tahapanId}
              onChange={(event) =>
                updateFilter("tahapanId", event.target.value)
              }
            >
              <option value="">Semua Tahapan</option>
              {options.stages.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.namaTahapan}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasFilters ? (
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setFilters({
                from: "",
                to: "",
                pegawaiId: "",
                desaId: "",
                rwId: "",
                tahapanId: "",
                page: 1,
                limit: 20,
              })
            }
          >
            Hapus filter
          </button>
        ) : null}
      </section>
      <section className="data-section table-panel">
        <div className="section-heading">
          <div>
            <h2>Daftar laporan</h2>
            <p>{result.total} laporan ditemukan</p>
          </div>
        </div>
        {state === "error" ? (
          <PageState
            tone="error"
            title="Laporan tidak dapat dimuat"
            message="Ubah filter atau coba muat halaman kembali."
          />
        ) : (
          <div
            className={`table-wrap ${state === "loading" ? "is-loading" : ""}`}
          >
            <table>
              <caption className="sr-only">Daftar seluruh laporan</caption>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pegawai</th>
                  <th>Lokasi</th>
                  <th>Tahapan</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td>{String(item.tanggalKegiatan).slice(0, 10)}</td>
                    <td>
                      <strong>{item.user?.nama || "-"}</strong>
                    </td>
                    <td>
                      {item.rw?.desa?.namaDesa || "-"} ·{" "}
                      {item.rw?.nomorRw || "-"}
                    </td>
                    <td>{item.tahapan?.namaTahapan || "-"}</td>
                    <td className="description-cell">{item.keterangan}</td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/admin/laporan/${item.id}`}
                      >
                        Detail <Icon name="chevronRight" size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && state !== "loading" && (
                  <tr>
                    <td className="empty-cell" colSpan="6">
                      Tidak ada laporan yang sesuai dengan filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {state === "loading" && (
              <div className="table-loading" role="status">
                Memuat laporan...
              </div>
            )}
          </div>
        )}
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
