document.addEventListener("DOMContentLoaded", () => {
  const uploadInput = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const preview = document.getElementById("imagePreview");
  const resultText = document.getElementById("resultText");
  const resultTable = document.getElementById("resultTable");
  const chartCanvas = document.getElementById("riskChart");
  const segmentedImg = document.getElementById("segmentationResult");

  let barChart = null;

  // 숫자 안전 변환 함수
  function safeFloat(val) {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  // 파일 선택 미리보기
  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => (preview.src = event.target.result);
      reader.readAsDataURL(file);
    }
  });

  // AI 분석 요청
  analyzeBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) return alert("📁 이미지를 선택하세요!");

    resultText.textContent = "🧠 AI 분석 중...";
    resultTable.innerHTML = "";
    segmentedImg.src = "";
    chartCanvas.style.display = "none";

    const formData = new FormData();
    formData.append("file", file);

    try {
      // ⚠️ Hugging Face 백엔드 주소 (필요 시 수정)
      const res = await fetch("https://okas2000-nasal-ai-backend.hf.space/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (${res.status})`);
      }

      const data = await res.json();
      console.log("✅ 백엔드 응답:", data);

      if (!data || !data.ratios) {
        resultText.textContent = "❌ 분석 실패: 응답 데이터 없음";
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

      // 🧾 결과 요약 텍스트 표시
      resultText.innerHTML = `
        <b>🧠 진단 결과:</b> ${data.diagnosis}<br>
        <b>📊 전체 위험도 지수:</b> ${(safeFloat(data.risk_index) * 100).toFixed(1)}%
      `;

      // 📋 결과 테이블 표시
      resultTable.innerHTML = `
        <tr><th>항목</th><th>실측(%)</th><th>정상컷(%)</th><th>편차(%)</th></tr>
        ${Object.keys(ratios)
          .map((key) => {
            const color = deviations[key] > 0 ? "#ff4d4d" : "#4CAF50";
            return `
              <tr>
                <td>${key}</td>
                <td>${ratios[key].toFixed(1)}</td>
                <td>${normals[key].toFixed(1)}</td>
                <td style="color:${color}; font-weight:bold;">${deviations[key].toFixed(1)}</td>
              </tr>`;
          })
          .join("")}
      `;

      // 📈 그래프 표시
      const ctx = chartCanvas.getContext("2d");
      chartCanvas.style.display = "block";

      if (barChart) {
        barChart.destroy();
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
      }

      const labels = Object.keys(ratios);
      const actualData = Object.values(ratios);
      const normalData = Object.values(normals);

      const maxVal = Math.max(...actualData, ...normalData, 60);
      const suggestedMax = Math.ceil(maxVal / 10) * 10;

      barChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "실측값 (%)",
              data: actualData,
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
            {
              label: "정상 기준선 (%)",
              data: normalData,
              type: "line",
              borderColor: "rgba(255, 99, 132, 1)",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              borderWidth: 3,
              pointRadius: 4,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top" },
            title: {
              display: true,
              text: "정상 대비 구조별 편차 (Deviation)",
              font: { size: 16 },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: suggestedMax,
              title: {
                display: true,
                text: "비율 (%)",
              },
            },
          },
        },
      });

      // 🩸 분할(segmentation) 시각화 이미지 표시
      if (data.segmented_image_base64) {
        segmentedImg.src = "data:image/png;base64," + data.segmented_image_base64;
      } else {
        segmentedImg.alt = "Segmentation 결과 없음";
      }
    } catch (err) {
      console.error("❌ 오류:", err);
      resultText.textContent = `⚠️ 분석 실패: ${err.message}`;
    }
  });
});
