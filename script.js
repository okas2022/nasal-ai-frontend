/* ===== 설정: 백엔드 API URL ===== */
const API_URL = "https://okas2000-nasal-ai-backend.hf.space/api/predict";

/* ===== DOM ===== */
const fileInput   = document.getElementById("fileInput");
const analyzeBtn  = document.getElementById("analyzeBtn");
const previewImg  = document.getElementById("previewImg");
const overlayImg  = document.getElementById("overlayImg");
const kpiDiagnosis= document.getElementById("kpiDiagnosis");
const kpiConf     = document.getElementById("kpiConf");
const kpiHyper    = document.getElementById("kpiHyper");
const kpiNarrow   = document.getElementById("kpiNarrow");
const metricsBody = document.getElementById("metricsBody");
const debugBox    = document.getElementById("debugBox");
const resultBadges= document.getElementById("resultBadges");

let radarChart;

/* 미리보기 표시 */
fileInput.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  previewImg.src = url;
});

/* 분석 버튼 */
analyzeBtn.addEventListener("click", async () => {
  const f = fileInput.files?.[0];
  if (!f) {
    alert("이미지를 먼저 선택해주세요.");
    return;
  }
  setBusy(true);

  try {
    const fd = new FormData();
    fd.append("file", f);

    const res = await fetch(API_URL, { method: "POST", body: fd });
    const text = await res.text();     // 방어적 파싱
    debugBox.textContent = `HTTP ${res.status}\n\n${text}`;

    const json = JSON.parse(text);
    renderResult(json);
  } catch (err) {
    console.error(err);
    alert("분석 중 오류가 발생했습니다. 콘솔/로그를 확인해주세요.");
  } finally {
    setBusy(false);
  }
});

/* 결과 렌더링 */
function renderResult(d) {
  // 오버레이
  if (d.overlay_mask_png_b64) {
    overlayImg.src = `data:image/png;base64,${d.overlay_mask_png_b64}`;
  }

  // KPI
  kpiDiagnosis.textContent = d.diagnosis ?? "-";
  kpiConf.textContent      = d.confidence ? `${(d.confidence*100).toFixed(1)}%` : "-";
  kpiHyper.textContent     = d.hypertrophy_grade ?? "-";
  kpiNarrow.textContent    = d.narrowness != null ? (d.narrowness*100).toFixed(1)+"%" : "-";

  // 배지
  resultBadges.classList.remove("hidden");
  resultBadges.innerHTML = "";
  resultBadges.appendChild(makeBadge("Primary", d.diagnosis || "Unknown"));
  if (d.airway_ratio != null) resultBadges.appendChild(makeBadge("Airway", `${(d.airway_ratio*100).toFixed(0)}%`));
  if (d.red_mean     != null) resultBadges.appendChild(makeBadge("Redness", d.red_mean.toFixed(2)));
  if (d.gloss_ratio  != null) resultBadges.appendChild(makeBadge("Gloss", d.gloss_ratio.toFixed(2)));

  // 표
  const rows = [
    ["Brightness",   fmt(d.brightness), "전체 밝기 (0~1)"],
    ["Red mean",     fmt(d.red_mean),    "발적(염증) 추정"],
    ["Circularity",  fmt(d.circularity), "원형도 (폴립 지표)"],
    ["Aspect ratio", fmt(d.aspect_ratio),"세장비 (비후 지표)"],
    ["Airway ratio", fmt(d.airway_ratio),"밝은 통로 비율"],
    ["Narrowness",   fmt(d.narrowness),  "협착도 (1-Airway)"],
    ["Entropy",      fmt(d.entropy),     "텍스처 변화량"],
    ["Edge density", fmt(d.edge_density),"엣지 밀도"],
    ["Gloss ratio",  fmt(d.gloss_ratio), "광택/점액 추정"],
  ];
  metricsBody.innerHTML = rows.map(([k,v,desc]) => `
    <tr><td>${k}</td><td>${v}</td><td>${desc}</td></tr>
  `).join("");

  // 레이더 차트
  drawRadar({
    Redness: d.red_mean ?? 0,
    Gloss: d.gloss_ratio ?? 0,
    Narrowness: d.narrowness ?? 0,
    Texture: d.entropy ?? 0,
    Edge: d.edge_density ?? 0
  });
}

function drawRadar(metrics) {
  const ctx = document.getElementById("radarCanvas");
  const labels = Object.keys(metrics);
  const data = Object.values(metrics).map(v => clamp01(v));

  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [{
        label: "Feature Index (0~1)",
        data,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      scales: { r: { suggestedMin: 0, suggestedMax: 1 } },
      plugins: { legend: { display: false } }
    }
  });
}

/* utils */
function clamp01(v) { return Math.max(0, Math.min(1, Number(v)||0)); }
function fmt(v) { return v == null ? "-" : Number(v).toFixed(3); }
function makeBadge(title, value) {
  const el = document.createElement("div");
  el.className = "badge";
  el.innerHTML = `<span class="badge-k">${title}</span><span class="badge-v">${value}</span>`;
  return el;
}
function setBusy(b) {
  analyzeBtn.disabled = !!b;
  analyzeBtn.textContent = b ? "분석 중..." : "AI 분석 시작";
}
