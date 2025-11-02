console.log("✅ script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const uploadInput = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const preview = document.getElementById("imagePreview");
  const resultText = document.getElementById("resultText");
  const riskChartCanvas = document.getElementById("riskChart");
  const segmentationImg = document.getElementById("segmentationResult");

  let riskChart = null;

  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => (preview.src = e.target.result);
      reader.readAsDataURL(file);
    }
  });

  analyzeBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) return alert("이미지를 선택하세요!");

    const formData = new FormData();
    formData.append("file", file);

    resultText.textContent = "🧠 AI 분석 중...";
    segmentationImg.src = "";

    try {
      const response = await fetch("https://okas2000-nasal-ai-backend.hf.space/api/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("✅ AI Response:", data);

      resultText.innerHTML = `
        <b>진단:</b> ${data.diagnosis} <br>
        <b>용종 가능성:</b> ${(data.polyp_score * 100).toFixed(1)}% <br>
        <b>전체 위험도:</b> ${(data.risk_index * 100).toFixed(1)}%
      `;

      // 시각화 그래프 (정상 대비 deviation)
      if (riskChart) riskChart.destroy();
      riskChart = new Chart(riskChartCanvas, {
        type: "bar",
        data: {
          labels: ["Redness", "Narrowness", "Brightness", "Green Ratio", "Polyp"],
          datasets: [{
            label: "정상 대비 편차 (Deviation)",
            data: [
              data.deviation.redness,
              data.deviation.narrowness,
              data.deviation.brightness,
              data.deviation.green_ratio,
              data.polyp_score
            ],
            backgroundColor: ["#ff6b6b", "#ffa94d", "#4dabf7", "#69db7c", "#d6336c"]
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              max: 1
            }
          }
        }
      });

      if (data.segmented_image_base64) {
        segmentationImg.src = "data:image/png;base64," + data.segmented_image_base64;
      }

    } catch (err) {
      console.error(err);
      resultText.textContent = "❌ 분석 중 오류 발생!";
    }
  });
});
