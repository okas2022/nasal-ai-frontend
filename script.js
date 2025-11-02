console.log("✅ script.js successfully loaded");

document.addEventListener("DOMContentLoaded", () => {
  const uploadInput = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const preview = document.getElementById("imagePreview");
  const resultText = document.getElementById("resultText");
  const resultTable = document.getElementById("resultTable").querySelector("tbody");

  const chartCanvas = document.getElementById("resultChart");
  let resultChart = null;

  // ✅ 이미지 미리보기
  uploadInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // ✅ 버튼 클릭 이벤트
  analyzeBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) {
      alert("이미지 파일을 선택하세요!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    resultText.textContent = "🧠 AI 분석 중입니다...";
    resultTable.innerHTML = "";

    try {
      const response = await fetch("https://okas2000-nasal-ai-backend.hf.space/api/predict", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("서버 응답 오류");

      const data = await response.json();
      console.log("✅ AI Response:", data);

      resultText.innerHTML = `<strong>결과:</strong> ${data.diagnosis || "Unknown"}`;
      const results = [
        ["진단", data.diagnosis],
        ["확신도", `${(data.confidence * 100).toFixed(1)}%`],
        ["비후 등급", data.hypertrophy_grade],
        ["협착도", `${(data.narrowness * 100).toFixed(1)}%`],
        ["홍조도", `${(data.redness * 100).toFixed(1)}%`],
      ];

      results.forEach(([key, value]) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${key}</td><td>${value}</td>`;
        resultTable.appendChild(row);
      });

      // ✅ Chart.js 시각화
      if (resultChart) resultChart.destroy();
      resultChart = new Chart(chartCanvas, {
        type: "radar",
        data: {
          labels: ["Redness", "Narrowness", "Brightness", "Green Ratio"],
          datasets: [{
            label: "Feature Index (0~1)",
            data: [
              data.redness || 0,
              data.narrowness || 0,
              data.mean_brightness || 0,
              data.green_ratio || 0
            ],
            fill: true,
            backgroundColor: "rgba(0, 102, 204, 0.2)",
            borderColor: "#003366",
            pointBackgroundColor: "#0066cc"
          }]
        },
        options: {
          responsive: true,
          scales: {
            r: { min: 0, max: 1 }
          }
        }
      });
    } catch (error) {
      console.error("❌ 분석 실패:", error);
      resultText.textContent = "❌ 분석 중 오류가 발생했습니다.";
    }
  });
});
