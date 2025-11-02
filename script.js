const backend = "https://okas2000-nasal-ai-backend.hf.space/";

const fileInput = document.getElementById("file-input");
const analyzeBtn = document.getElementById("analyze-btn");
const loading = document.getElementById("loading");
const resultSection = document.getElementById("result-section");
const overlayPreview = document.getElementById("overlay-preview");
const inputPreview = document.getElementById("input-preview");
const metricTable = document.getElementById("metric-table");
const chartCanvas = document.getElementById("chart");

let chart;

analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("이미지를 업로드해주세요!");
    return;
  }

  loading.style.display = "block";
  resultSection.style.display = "none";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${backend}api/predict`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("서버 응답 오류: " + res.status);

    const data = await res.json();
    showResults(file, data);
  } catch (err) {
    alert("❌ 분석 실패: " + err.message);
  } finally {
    loading.style.display = "none";
  }
});

function showResults(file, data) {
  resultSection.style.display = "block";
  inputPreview.src = URL.createObjectURL(file);
  overlayPreview.src = data.overlay_b64;

  const m = data.metrics;
  const t = m.thresholds;
  const rows = `
    <tr><th>항목</th><th>값</th><th>정상 기준</th></tr>
    <tr><td>점막 색</td><td>${m.color_label}</td><td>분홍색 (정상)</td></tr>
    <tr><td>폴립 면적 비율</td><td>${(m.polyp_area_ratio * 100).toFixed(2)}%</td><td><${(t.polyp_area_ratio * 100).toFixed(1)}%</td></tr>
    <tr><td>분비물 비율</td><td>${(m.secretion_ratio * 100).toFixed(2)}%</td><td><${(t.secretion_ratio * 100).toFixed(1)}%</td></tr>
    <tr><td>기도 개방 비율</td><td>${(m.airway_ratio * 100).toFixed(2)}%</td><td>>${(t.airway_ratio_min * 100).toFixed(1)}%</td></tr>
    <tr><td>총 위험도</td><td>${m.risk_score}</td><td>-</td></tr>
    <tr><td>AI 요약 판단</td><td colspan="2"><b>${m.summary_label}</b></td></tr>
  `;
  metricTable.innerHTML = rows;

  drawLineChart(m);
}

// ✅ Line Chart + 정상범위 밴드형 표시
function drawLineChart(m) {
  const ctx = chartCanvas.getContext("2d");
  if (chart) chart.destroy();

  const labels = ["폴립 비율", "분비물 비율", "기도 개방 비율"];
  const values = [
    m.polyp_area_ratio * 100,
    m.secretion_ratio * 100,
    m.airway_ratio * 100,
  ];

  const lower = [0, 0, m.thresholds.airway_ratio_min * 100];
  const upper = [
    m.thresholds.polyp_area_ratio * 100,
    m.thresholds.secretion_ratio * 100,
    100,
  ];

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "측정값 (%)",
          data: values,
          borderColor: "#2196f3",
          backgroundColor: "#2196f3",
          fill: false,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: "#2196f3",
        },
        {
          label: "정상 범위",
          data: upper.map((u, i) => (u + lower[i]) / 2),
          fill: {
            target: { value: lower },
            above: "rgba(144, 238, 144, 0.4)",
            below: "rgba(255, 99, 71, 0.2)",
          },
          borderColor: "rgba(144,238,144,0)",
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "정상 범위 대비 실측 그래프" },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "비율 (%)" },
          min: 0,
          max: 100,
        },
      },
    },
  });
}
