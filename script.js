const fileInput = document.getElementById("fileInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultContainer = document.getElementById("resultContainer");
const resultImage = document.getElementById("resultImage");
const summary = document.getElementById("summary");
const colorLabel = document.getElementById("colorLabel");
const riskScore = document.getElementById("riskScore");
const chartCanvas = document.getElementById("chartCanvas");

let chart = null;

analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("이미지를 업로드해주세요.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/predict", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();

  if (data.error) {
    alert("서버 오류: " + data.error);
    return;
  }

  const m = data.metrics;
  resultContainer.classList.remove("hidden");
  resultImage.src = data.overlay_b64;
  summary.textContent = `📌 판독 소견: ${m.summary_label}`;
  colorLabel.textContent = `🎨 점막 색상: ${m.color_label}`;
  riskScore.textContent = `⚠️ 위험도 지수: ${m.risk_score}`;

  drawLineChart(m);
});

function drawLineChart(m) {
  const ctx = chartCanvas.getContext("2d");
  if (chart) chart.destroy();

  const labels = ["폴립 비율", "분비물 비율", "기도 개방 비율"];
  const values = [
    m.polyp_area_ratio * 100,
    m.secretion_ratio * 100,
    m.airway_ratio * 100,
  ];
  const normalRef = [
    m.thresholds.polyp_area_ratio * 100,
    m.thresholds.secretion_ratio * 100,
    m.thresholds.airway_ratio_min * 100,
  ];

  const maxValue = Math.max(...values, ...normalRef) * 1.5;

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "측정값 (%)",
          data: values,
          backgroundColor: "rgba(33,150,243,0.7)",
          borderColor: "rgba(33,150,243,1)",
          borderWidth: 2,
        },
        {
          label: "정상 기준선",
          data: normalRef,
          type: "line",
          borderColor: "rgba(255,99,132,1)",
          borderWidth: 3,
          pointRadius: 4,
          fill: false,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: {
          display: true,
          text: "정상 범위 대비 실측 그래프",
          font: { size: 16, weight: "bold" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: Math.max(100, maxValue),
          title: { display: true, text: "비율 (%)" },
        },
      },
    },
  });
}
