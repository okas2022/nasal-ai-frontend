const backend = "https://okas2000-nasal-ai-backend.hf.space"; // 👈 Hugging Face 백엔드 주소

const fileInput = document.getElementById("file-input");
const analyzeBtn = document.getElementById("analyze-btn");
const loading = document.getElementById("loading");
const resultSection = document.getElementById("result-section");
const overlayPreview = document.getElementById("overlay-preview");
const inputPreview = document.getElementById("input-preview");
const metricTable = document.getElementById("metric-table");
const chartCanvas = document.getElementById("chart");

let chart;

// 📤 분석 요청
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

    const res = await fetch(`${backend}/api/predict`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("서버 응답 오류: " + res.status);

    const data = await res.json();
    showResults(file, data);
  } catch (err) {
    alert("❌ 분석 실패: " + err.message);
    console.error(err);
  } finally {
    loading.style.display = "none";
  }
});

// 📊 결과 표시
function showResults(file, data) {
  resultSection.style.display = "block";
  inputPreview.src = URL.createObjectURL(file);
  overlayPreview.src = data.overlay_b64;

  const m = data.metrics;
  const rows = `
    <tr><th>항목</th><th>값</th><th>정상 기준</th></tr>
    <tr><td>폴립 면적 비율</td><td>${(m.polyp_area_ratio * 100).toFixed(2)}%</td><td><${THRESHOLD.polyp_area_ratio * 100}%</td></tr>
    <tr><td>분비물 비율</td><td>${(m.secretion_ratio * 100).toFixed(2)}%</td><td><${THRESHOLD.secretion_ratio * 100}%</td></tr>
    <tr><td>기도 개방 비율</td><td>${(m.airway_ratio * 100).toFixed(2)}%</td><td>>${THRESHOLD.airway_ratio_min * 100}%</td></tr>
    <tr><td>총 위험도</td><td>${m.risk_score}</td><td>-</td></tr>
    <tr><td>AI 요약 판단</td><td colspan="2"><b>${m.summary_label}</b></td></tr>
  `;
  metricTable.innerHTML = rows;

  drawChart(m);
}

// 📈 그래프 표시
function drawChart(m) {
  const ctx = chartCanvas.getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Polyp", "Secretion", "Airway"],
      datasets: [
        {
          label: "비율 (%)",
          data: [
            m.polyp_area_ratio * 100,
            m.secretion_ratio * 100,
            m.airway_ratio * 100,
          ],
          backgroundColor: ["#4caf50", "#03a9f4", "#ff9800"],
        },
        {
          label: "정상 기준",
          data: [
            m.thresholds.polyp_area_ratio * 100,
            m.thresholds.secretion_ratio * 100,
            m.thresholds.airway_ratio_min * 100,
          ],
          backgroundColor: ["#9ccc65", "#81d4fa", "#ffcc80"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "정상 대비 비율 비교 (%)" },
      },
    },
  });
}

// 백엔드에서 받은 정상 기준값
const THRESHOLD = {
  polyp_area_ratio: 0.02,
  secretion_ratio: 0.05,
  airway_ratio_min: 0.15,
};
