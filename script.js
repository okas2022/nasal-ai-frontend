// ✅ Hugging Face 백엔드 연결 설정
const API_URL = "https://okas2022-nasal-ai-backend.hf.space/analyze";

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("imageUpload");
  const file = fileInput.files[0];

  if (!file) {
    alert("이미지를 먼저 업로드하세요!");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  document.getElementById("status").innerText = "🧠 AI 분석 중...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const result = await response.json();
    console.log("AI 결과:", result);

    // 분석 결과 표시
    document.getElementById("status").innerText = "✅ 분석 완료!";
    document.getElementById("lesion").innerText = result.lesion_type;
    document.getElementById("mucosa").innerText = result.mucosa_color;
    document.getElementById("hypertrophy").innerText = result.hypertrophy_grade;
    document.getElementById("confidence").innerText = (result.confidence * 100).toFixed(1) + "%";

    // 그래프 렌더링
    renderChart(result);
  } catch (error) {
    console.error("❌ 분석 실패:", error);
    document.getElementById("status").innerText = `❌ 실패: ${error.message}`;
  }
});

function renderChart(result) {
  const ctx = document.getElementById("resultChart").getContext("2d");
  if (window.resultChart) window.resultChart.destroy();

  const normalLine = 50; // 정상 기준선 (예시)
  const deviation = Math.max(0, (result.confidence * 100) - normalLine);

  window.resultChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["정상 기준선", "AI 예측값"],
      datasets: [
        {
          label: "정상 범위",
          data: [normalLine, normalLine],
          borderColor: "gray",
          borderDash: [5, 5],
          fill: false,
        },
        {
          label: "AI 판정값",
          data: [normalLine, result.confidence * 100],
          borderColor: "red",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: "Confidence (%)" },
        },
      },
    },
  });
}
