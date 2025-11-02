document.addEventListener("DOMContentLoaded", () => {
  const uploadInput = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const preview = document.getElementById("imagePreview");
  const resultText = document.getElementById("resultText");
  const resultTable = document.getElementById("resultTable");
  const chartCanvas = document.getElementById("riskChart");
  const segmentedImg = document.getElementById("segmentationResult");

  let barChart = null;

  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => (preview.src = event.target.result);
      reader.readAsDataURL(file);
    }
  });

  analyzeBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) return alert("이미지를 선택하세요!");

    resultText.textContent = "🧠 AI 분석 중...";
    resultTable.innerHTML = "";
    segmentedImg.src = "";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://okas2000-nasal-ai-backend.hf.space/api/predict", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("✅ 결과:", data);

      // 결과 텍스트
      resultText.innerHTML = `
        <b>진단 결과:</b> ${data.diagnosis}<br>
        <b>위험도 지수:</b> ${(data.risk_index * 100).toFixed(1)}%
      `;

      // 표 구성
      resultTable.innerHTML = `
        <tr><th>항목</th><th>실측(%)</th><th>정상컷(%)</th><th>편차(%)</th></tr>
        ${Object.keys(data.ratios)
          .map((key) => {
            const ratio = (data.ratios[key] * 100).toFixed(1);
            const normal = (data.normal_cutoff[key] * 100).toFixed(1);
            const dev = (data.deviation[key] * 100).toFixed(1);
            const color = dev > 0 ? "#ff6666" : "#66cc66";
            return `<tr>
              <td>${key}</td>
              <td>${ratio}</td>
              <td>${normal}</td>
              <td style="color:${color};font-weight:bold;">${dev}</td>
            </tr>`;
          })
          .join("")}
      `;

      // 그래프
      const keys = Object.keys(data.ratios);
      const actual = keys.map((k) => data.ratios[k] * 100);
      const normal = keys.map((k) => data.normal_cutoff[k] * 100);

      if (barChart) barChart.destroy();
      barChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
          labels: keys,
          datasets: [
            {
              label: "실제 측정",
              data: actual,
              backgroundColor: "rgba(54, 162, 235, 0.5)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
            {
              label: "정상 기준선",
              data: normal,
              backgroundColor: "rgba(255, 99, 132, 0.3)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "비율 (%)" },
              max: 60,
            },
          },
        },
      });

      // segmentation 이미지 표시
      if (data.segmented_image_base64) {
        segmentedImg.src = "data:image/png;base64," + data.segmented_image_base64;
      }
    } catch (err) {
      console.error(err);
      resultText.textContent = "❌ 분석 중 오류 발생";
    }
  });
});
