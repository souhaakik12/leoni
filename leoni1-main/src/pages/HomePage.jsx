import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRecrutements } from "../context/RecrutementsContext.jsx";
import "./HomePage.css";

const alertes = [
  { nom: "Fatima Zahra El Idrissi", matricule: "EMP001", dept: "Production", expiration: "15/04/2026" },
  { nom: "Amina Bennani", matricule: "EMP023", dept: "Logistique", expiration: "20/04/2026" },
  { nom: "Khadija Alami", matricule: "EMP045", dept: "Qualite", expiration: "28/04/2026" },
];

const missionsChart = [
  { label: "Mission A", pct: 85, color: "#0e4f79" },
  { label: "Mission B", pct: 72, color: "#1f73a7" },
  { label: "Mission C", pct: 68, color: "#3f91c2" },
  { label: "Mission D", pct: 55, color: "#8bb8da" },
];

function parseFrDate(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function PieChart({ data }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 78;
  const total = data.reduce((sum, item) => sum + item.pct, 0) || 1;
  let start = -Math.PI / 2;

  const slices = data.map((item) => {
    const angle = (item.pct / total) * Math.PI * 2;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const end = start + angle;
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    start = end;
    return { ...item, path };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="hp-pie-svg">
      {slices.map((slice) => (
        <path key={slice.label} d={slice.path} fill={slice.color} stroke="#f5f9fc" strokeWidth="2" />
      ))}
      <circle cx={cx} cy={cy} r="34" fill="#f5f9fc" />
    </svg>
  );
}

function TrendLineChart({ data, secondaryData }) {
  if (data.length === 0) {
    return <div className="hp-empty-chart">Aucune donnee disponible.</div>;
  }

  const width = 440;
  const height = 190;
  const padX = 30;
  const padY = 22;
  const allValues = [
    ...data.map((item) => item.value),
    ...(secondaryData ? secondaryData.map((item) => item.value) : []),
  ];
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const span = Math.max(max - min, 1);
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const valueToY = (value) => height - padY - ((value - min) / span) * (height - padY * 2);
  const toPoints = (series) =>
    series.map((item, index) => `${padX + index * step},${valueToY(item.value)}`).join(" ");

  const mainPoints = toPoints(data);
  const secondPoints = secondaryData ? toPoints(secondaryData) : null;
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="hp-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 1, 2, 3].map((grid) => {
          const y = padY + grid * ((height - padY * 2) / 3);
          return <line key={grid} x1={padX} y1={y} x2={width - padX} y2={y} className="hp-grid-line" />;
        })}

        {secondPoints && <polyline points={secondPoints} className="hp-line-secondary" />}
        <polyline points={mainPoints} className="hp-line-main" />

        {data.map((item, index) => {
          if (index % labelEvery !== 0 && index !== data.length - 1) return null;
          return (
            <text key={item.label} x={padX + index * step} y={height - 5} className="hp-x-label">
              {item.label.slice(0, 5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SemiGauge({ value }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="hp-gauge">
      <svg viewBox="0 0 180 110">
        <path d="M 20 90 A 70 70 0 0 1 160 90" className="hp-gauge-track" />
        <path d="M 20 90 A 70 70 0 0 1 160 90" className="hp-gauge-fill" pathLength="100" strokeDasharray={`${safeValue} 100`} />
        <text x="90" y="76" textAnchor="middle" className="hp-gauge-value">{safeValue}%</text>
      </svg>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { entries, byDate, todayCount, todayStr } = useRecrutements();

  const dateSeries = useMemo(
    () =>
      Object.entries(byDate)
        .sort((a, b) => parseFrDate(a[0]) - parseFrDate(b[0]))
        .map(([label, value]) => ({ label, value })),
    [byDate]
  );

  const totalCandidats = entries.reduce((sum, entry) => sum + entry.candidats.length, 0);
  const todayEntries = entries.filter((entry) => entry.date === todayStr);
  const maxDaily = Math.max(...dateSeries.map((item) => item.value), 1);
  const avgDaily = dateSeries.length
    ? (dateSeries.reduce((sum, item) => sum + item.value, 0) / dateSeries.length).toFixed(1)
    : "0";
  const previousValue = dateSeries.length > 1 ? dateSeries[dateSeries.length - 2].value : 0;
  const changeVsPrevious = previousValue > 0 ? (((todayCount - previousValue) / previousValue) * 100).toFixed(1) : "0.0";
  const gaugeValue = Math.round((todayCount / maxDaily) * 100);

  const movingAverage = dateSeries.map((point, index, array) => {
    const start = Math.max(0, index - 2);
    const slice = array.slice(start, index + 1);
    const avg = slice.reduce((sum, item) => sum + item.value, 0) / slice.length;
    return { label: point.label, value: Number(avg.toFixed(2)) };
  });

  const totalMissionPct = missionsChart.reduce((sum, item) => sum + item.pct, 0);
  const kpis = [
    { label: "Missions", value: "5" },
    { label: "Foyers", value: "8" },
    { label: "Total Candidats", value: String(totalCandidats) },
    { label: "Aujourd'hui", value: String(todayCount) },
  ];

  return (
    <div className="home-dashboard">
      <div className="hp-page-title">
        <h2>Dashboard</h2>
        <p>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <section className="hp-summary-strip">
        <div className="hp-period-card">
          <span>Periode</span>
          <strong>{new Date().getFullYear()}</strong>
        </div>
        <div className="hp-kpi-grid">
          {kpis.map((item) => (
            <div key={item.label} className="hp-kpi-card">
              <div className="hp-kpi-value">{item.value}</div>
              <div className="hp-kpi-label">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-main-grid">
        <div className="hp-left-column">
          <article className="hp-panel">
            <div className="hp-panel-title">Capacite Recrutement</div>
            <div className="hp-panel-body">
              <h4 className="hp-section-heading">Repartition missions performantes</h4>

              <div className="hp-stacked-bar">
                {missionsChart.map((segment) => (
                  <div
                    key={segment.label}
                    className="hp-stacked-segment"
                    style={{ width: `${(segment.pct / totalMissionPct) * 100}%`, background: segment.color }}
                    title={`${segment.label}: ${segment.pct}%`}
                  >
                    {segment.pct}%
                  </div>
                ))}
              </div>

              <div className="hp-segment-legend">
                {missionsChart.map((segment) => (
                  <span key={segment.label}>
                    <i style={{ background: segment.color }} />
                    {segment.label}
                  </span>
                ))}
              </div>

              <div className="hp-split-grid">
                <div className="hp-gauge-card">
                  <p className="hp-mini-title">Vs periode precedente</p>
                  <SemiGauge value={gaugeValue} />
                  <p className={`hp-delta ${Number(changeVsPrevious) >= 0 ? "up" : "down"}`}>
                    {Number(changeVsPrevious) >= 0 ? "+" : ""}
                    {changeVsPrevious}% vs dernier jour
                  </p>
                </div>

                <div className="hp-trend-card">
                  <p className="hp-mini-title">Evolution des candidatures</p>
                  <TrendLineChart data={dateSeries} secondaryData={movingAverage} />
                  <div className="hp-line-legend">
                    <span><i className="main" /> Candidats / jour</span>
                    <span><i className="avg" /> Moyenne glissante</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="hp-right-column">
          <article className="hp-panel">
            <div className="hp-panel-title">Flux Quotidien</div>
            <div className="hp-panel-body">
              <p className="hp-section-heading">Tendance par date</p>
              <TrendLineChart data={dateSeries} />

              <div className="hp-metrics-stack">
                <div className="hp-metric-box">
                  <span>Pic journalier</span>
                  <strong>{maxDaily}</strong>
                </div>
                <div className="hp-metric-box">
                  <span>Moyenne / jour</span>
                  <strong>{avgDaily}</strong>
                </div>
                <div className="hp-metric-box">
                  <span>Jours actifs</span>
                  <strong>{dateSeries.length}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="hp-panel">
            <div className="hp-panel-title">Missions les plus efficaces</div>
            <div className="hp-panel-body hp-pie-layout">
              <PieChart data={missionsChart} />
              <div className="hp-pie-legend">
                {missionsChart.map((segment) => (
                  <div key={segment.label}>
                    <i style={{ background: segment.color }} />
                    <span>{segment.label}</span>
                    <strong>{segment.pct}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="hp-bottom-grid">
        <article className="hp-panel">
          <div className="hp-panel-title">Recrutements du jour - {todayStr}</div>
          <div className="hp-panel-body">
            {todayEntries.length === 0 ? (
              <div className="hp-empty-state">Aucune saisie recruteur pour aujourd'hui.</div>
            ) : (
              <div className="hp-today-list">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="hp-today-card">
                    <div className="hp-today-head">
                      <div>
                        <span className="hp-mission-tag">{entry.mission}</span>
                        <h5>{entry.ville}</h5>
                        <small>{entry.responsable}</small>
                      </div>
                      <span className="hp-count-badge">{entry.candidats.length} pers.</span>
                    </div>

                    <div className="hp-candidat-tags">
                      {entry.candidats.map((candidat, index) => (
                        <span key={`${entry.id}-${index}`}>
                          <b>{candidat.nom.charAt(0)}</b>
                          {candidat.nom} - {candidat.poste}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="hp-panel">
          <div className="hp-panel-title">Alertes Contrats</div>
          <div className="hp-panel-body hp-alert-list">
            {alertes.map((alerte) => (
              <div key={alerte.matricule} className="hp-alert-item">
                <div>
                  <h5>{alerte.nom}</h5>
                  <p>{alerte.matricule} - {alerte.dept}</p>
                  <strong>Expiration: {alerte.expiration}</strong>
                </div>
                <button onClick={() => navigate("/contracts")}>Voir</button>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
