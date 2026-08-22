import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { historyApi } from "../../api/history.js";
import PageHeader from "../../components/PageHeader.jsx";
import PageState from "../../components/PageState.jsx";
import Icon from "../../components/Icon.jsx";

export default function ReportDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    historyApi
      .getDetail(id)
      .then((response) => {
        setReport(response.data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [id]);
  if (state === "loading")
    return (
      <section className="page">
        <PageState
          title="Menyiapkan detail laporan"
          message="Mengambil data kegiatan dan dokumentasi."
        />
      </section>
    );
  if (state === "error" || !report)
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Detail laporan tidak ditemukan"
          message="Laporan mungkin sudah tidak tersedia atau Anda tidak memiliki akses."
        />
      </section>
    );
  const backTo = location.pathname.startsWith("/admin")
    ? "/admin/laporan"
    : "/pegawai/histori";
  const editAction =
    report.canEdit && !location.pathname.startsWith("/admin") ? (
      <Link
        className="primary-button"
        to={`/pegawai/laporan/${report.id}/edit`}
      >
        Edit laporan
      </Link>
    ) : null;
  return (
    <section className="page">
      <Link className="back-link icon-label" to={backTo}>
        <Icon name="arrowLeft" />
        Kembali ke daftar laporan
      </Link>
      <PageHeader
        title="Detail laporan"
        description="Informasi kegiatan dan dokumentasi yang tersimpan."
        action={editAction}
      />
      <div className="detail-grid">
        <article className="data-section detail-card">
          <div className="section-heading">
            <div>
              <h2>Informasi kegiatan</h2>
              <p>Data yang dikirim oleh pegawai.</p>
            </div>
          </div>
          <dl>
            {report.user?.nama && (
              <div>
                <dt>PIC</dt>
                <dd>{report.user.nama}</dd>
              </div>
            )}
            <div>
              <dt>Tanggal</dt>
              <dd>{String(report.tanggalKegiatan || "-").slice(0, 10)}</dd>
            </div>
            {report.createdAt && (
              <div>
                <dt>Dikirim</dt>
                <dd>{new Date(report.createdAt).toLocaleString("id-ID")}</dd>
              </div>
            )}
            <div>
              <dt>Lokasi</dt>
              <dd>
                {report.rw?.desa?.namaDesa || "-"} · {report.rw?.nomorRw || "-"}
              </dd>
            </div>
            <div>
              <dt>Tahapan</dt>
              <dd>{report.tahapan?.namaTahapan || "-"}</dd>
            </div>
            {report.nomorPerangkat && (
              <div>
                <dt>Nomor perangkat</dt>
                <dd>{report.nomorPerangkat}</dd>
              </div>
            )}
            <div className="detail-description">
              <dt>Keterangan</dt>
              <dd>{report.keterangan}</dd>
            </div>
          </dl>
        </article>
        <article className="data-section gallery-card">
          <div className="section-heading">
            <div>
              <h2>Dokumentasi</h2>
              <p>{(report.dokumentasi || []).length} foto tersimpan</p>
            </div>
          </div>
          <div className="detail-gallery">
            {(report.dokumentasi || []).map((item, index) => (
              <figure key={item.id || item.storagePath || index}>
                <img src={item.signedUrl} alt={item.originalName} />
                <figcaption>
                  <Icon name="photo" />
                  {item.originalName}
                </figcaption>
              </figure>
            ))}
            {!report.dokumentasi?.length && (
              <p className="empty-state">Belum ada dokumentasi.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
