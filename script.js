// === Yonsei ENT Nasal AI Frontend ===

// 🔗 Hugging Face Backend 주소 (본인 백엔드 URL로 정확히 교체!)
const BACKEND_URL = "https://okas2000-nasal-ai-backend.hf.space/api/predict";

// HTML 요소 참조
const fileInput = document.getElementById("imageUpload");
const analyzeBtn = document.getElementById("analyzeBtn");
const imagePreview = document.getElementById("imagePreview");
const resultText = document.getElementById("resultText");
const summaryContainer = document.getElementById("summaryTableContainer");
const chartCanvas = document.getElementById("colorChart");

let colorChart = null;

// 초기 로드 시 백엔드 연결 테스트
(async () => {
  try {
    const res = await fetch(BACKEND_URL, { method: "GET" });
    console.log("✅ Backend reachable:", res.status);
  } catch (e) {
    console.error("❌ Backend connection failed:", e);
  }
})();

// 이미지 미리보기 기능
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// AI 분석 버튼 클릭 시 이벤트
analyzeBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("먼저 이미지를 업로드하세요!");
    return;
  }

  resultText.textContent = "🔍 AI가 분석 중입니다... 잠시만 기다려주세요.";
  summaryContainer.innerHTML = "";
  if (colorChart) {
    colorChart.destroy();
    colorChart = null;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const result = await response.json();
    displayResults(result);
  } catch (error) {
    console.error("❌ Fetch error:", error);
    resultText.textContent = "❌ 분석 중 오류가 발생했습니다. 백엔드 연결 상태를 확인하세요.";
  }
});

// === 결과 표시 함수 ===
function displayResults(result) {
  const {
    lesion_type,
    hypertrophy_grade,
    confidence,
    mean_brightness,
    green_ratio,
    image_size,
  } = result;

  // 결과 텍스트
  resultText.innerHTML = `
    <h3>AI 분석 결과 요약</h3>
    <b>병변 유형:</b> ${lesion_type}<br>
    <b>점막 비후 정도:</b> ${hypertrophy_grade}<br>
    <b>신뢰도:</b> ${(confidence * 100).toFixed(1)}%<br>
    <b>평균 밝기:</b> ${mean_brightness.toFixed(3)}<br>
    <b>녹색 비율:</b> ${green_ratio.toFixed(3)}<br>
    <b>이미지 크기:</b> ${image_size[0]} × ${image_size[1]} px
  `;

  // 표 형태 요약
  summaryContainer.innerHTML = `
    <table class="result-table">
      <tr><th>항목</th><th>값</th></tr>
      <tr><td>병변 유형</td><td>${lesion_type}</td></tr>
      <tr><td>점막 비후 정도</td><td>${hypertrophy_grade}</td></tr>
      <tr><td>신뢰도</td><td>${(confidence * 100).toFixed(1)}%</td></tr>
      <tr><td>평균 밝기</td><td>${mean_brightness.toFixed(3)}</td></tr>
      <tr><td>녹색 비율</td><td>${green_ratio.toFixed(3)}</td></tr>
    </table>
  `;

  // 그래프 표시
  const ctx = chartCanvas.getContext("2d");
  colorChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Mean Brightness", "Green Ratio", "Confidence"],
      datasets: [
        {
          label: "AI 색상 기반 분석 결과",
          data: [mean_brightness, green_ratio, confidence],
          backgroundColor: ["#f1c40f", "#2ecc71", "#3498db"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "AI 분석 수치 (비강 점막 특성)",
          font: { size: 16 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1.0,
          title: { display: true, text: "비율 값" },
        },
      },
    },
  });
}
