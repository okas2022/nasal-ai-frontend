// =============================
// ✅ 백엔드 주소 설정 (꼭 수정 필요)
// =============================
// Hugging Face Space 이름이 다르다면, 아래 주소만 바꾸세요.
const backendBase = "https://okas2000-nasal-ai-backend.hf.space";

// 백엔드 주소 끝에 슬래시 자동 보정
const backend = backendBase.endsWith("/") ? backendBase : backendBase + "/";

// =============================
// DOM 요소 선택
// =============================
const fileInput = document.getElementById("file-input");
const analyzeBtn = document.getElementById("analyze-btn");
const loading = document.getElementById("loading");
const resultSection = document.getElementById("result-section");
const overlayPreview = document.getElementById("overlay-preview");
const inputPreview = document.getElementById("input-preview");
const metricTable = document.getElementById("metric-table");
const chartCanvas = document.getElementById("chart");

let chart;

// =============================
// 📤 분석 요청
// =============================
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

    // ✅ 우선 /api/predict 요청
    let response = await fetch(`${backend}api/predict`, {
      method: "POST",
      body: formData,
    });

    // ✅ /api/predict 가 404이면 /predict 로 재시도
    if (response.status === 404) {
      console.warn("[WARN] /api/predict not found → retrying /predict");
      response = await fetch(`${backend}predict`, {
        method: "POST",
        body: formData,
      });
    }

    if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);

    const data = await response.json();
    showResults(file, data);
  } catch (err) {
    alert("❌ 분석 실패: " + err.message);
    console.error(err);
  } finally {
    loading.style.display = "none";
  }
});

// =============================
// 📊 결과 표시
// =============================
function showResults(file, data) {
  resultSection.style.display = "block";
  inputPreview.src = URL.createObjectURL(file);
  overlayPreview.src = data.overlay_b64;

  const m = data.metrics;
  const rows = `
    <tr><th>항목</th><th>값</th><th>정상 기준</th></tr>
    <tr><td>폴립 면적 비율</td><td>${(m.polyp_area_ratio * 100).toFixed(2)}%</td><td><${(m.thresholds.polyp_area_ratio * 100).toFixed(1)}%</td></tr>
    <tr><td>분비물 비율</td><td>${(m.secretion_ratio * 100).toFixed(2)}%</td><td><${(m.thresholds.secretion_ratio * 100).toFixed(1)}%</td></tr>
    <tr><td>기도 개방 비율</td><td>${(m.airway_ratio * 100).toFixed(2)}%</td><td>>${(m.thresholds.airway_ratio_min * 100).toFixed(1)}%</td></tr>
    <tr><td>총 위험도 점수</td><td>${m.risk_score}</td><td>-</td></tr>
    <tr><td>AI 요약 판단</td><td colspan="2"><b>${m.summary_label}</b></td></tr>
  `;
  metricTable.innerHTML = rows;

  drawChart(m);
}

// =============================
// 📈 그래프 표시 (정상 대비 시각화)
// =============================
function drawChart(m) {
  const ctx = chartCanvas.getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Polyp", "Secretion", "Airway"],
      datasets: [
        {
          label: "현재 비율 (%)",
          data: [
            m.polyp_area_ratio * 100,
            m.secretion_ratio * 100,
            m.airway_ratio * 100,
          ],
          backgroundColor: ["#4caf50", "#03a9f4", "#ff9800"],
        },
        {
          label: "정상 기준 (%)",
          data: [
            m.thresholds.polyp_area_ratio * 100,
            m.thresholds.secretion_ratio * 100,
            m.thresholds.airway_ratio_min * 100,
          ],
          backgroundColor: ["#a5d6a7", "#81d4fa", "#ffcc80"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "정상 대비 비율 비교 그래프" },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "비율 (%)" },
          ticks: { stepSize: 10 },
        },
      },
    },
  });
}

// =============================
// ✅ 정상 기준 (프론트 고정값)
// =============================
const THRESHOLD = {
  polyp_area_ratio: 0.02,
  secretion_ratio: 0.05,
  airway_ratio_min: 0.15,
};
