document.addEventListener("DOMContentLoaded", () => {
  const uploadInput = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const preview = document.getElementById("imagePreview");
  const resultText = document.getElementById("resultText");
  const resultTable = document.getElementById("resultTable");
  const chartCanvas = document.getElementById("riskChart");
  const segmentedImg = document.getElementById("segmentationResult");

  let barChart = null;

  function safeFloat(val) {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

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
      // Hugging Face 백엔드 API 주소
      const res = await fetch("https://okas2000-nasal-ai-backend.hf.space/api/predict", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      console.log("✅ 백엔드 응답:", data);

      if (!data.ratios || Object.keys(data.ratios).length === 0) {
        resultText.textContent = "❌ 분석 실패: 데이터가 없습니다.";
        return;
      }

      const ratios = {};
      const normals = {};
      const deviations = {};
      for (const key of Object.keys(data.ratios)) {
        ratios[key] = safeFloat(data.ratios[key]) * 100;
        normals[key] = safeFloat(data.normal_cutoff[key]) * 100;
        deviations[key] = safeFloat(data.deviation[key]) * 100;
      }

      // 결과 표시
      resultText.innerHTML = `
        <b>진단 결과:</b> ${data.diagnosis}<br>
        <b>위험도 지수:</b> ${(safeFloat(data.risk_index) * 100).toFixed(1)}%
      `;

      // 표 표시
      resultTable.innerHTML = `
        <tr><th>항목</th><th>실측(%)</th><th>정상컷(%)</th><th>편차(%)</th></tr>
        ${Object.keys(ratios)
          .map((key) => {
            const color = deviations[key] > 0 ? "#ff6666" : "#66cc66";
            return `<tr>
              <td>${key}</td>
              <td>${ratios[key].toFixed(1)}</td>
              <td>${normals[key].toFixed(1)}</td>
              <td style="color:${color};font-weight:bold;">${deviations[key].toFixed(1)}</td>
            </tr>`;
          })
          .join("")}
      `;

      // 그래프
      const ctx = chartCanvas.getContext("2d");
      if (barChart) {
        barChart.destroy();
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
      }

      barChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(ratios),
          datasets: [
            {
              label: "실측값 (%)",
              data: Object.values(ratios),
              backgroundColor: "rgba(54, 162, 235, 0.5)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
            {
              label: "정상 기준선 (%)",
              data: Object.values(normals),
              backgroundColor: "rgba(255, 99, 132, 0.3)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 2,
              type: "line",
              fill: false,
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top" },
            title: { display: true, text: "정상 대비 구조별 비율 비교" },
          },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 60,
              title: { display: true, text: "비율 (%)" },
            },
          },
        },
      });

      // 분할 이미지 표시
      if (data.segmented_image_base64) {
        segmentedImg.src = "data:image/png;base64," + data.segmented_image_base64;
      }
    } catch (err) {
      console.error(err);
      resultText.textContent = "❌ 분석 중 오류 발생";
    }
  });
});
