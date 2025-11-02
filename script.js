document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("imageUpload");
  const file = fileInput.files[0];
  if (!file) {
    alert("이미지를 업로드해주세요!");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const resultText = document.getElementById("resultText");
  resultText.textContent = "🧠 AI 분석 중... 잠시만 기다려주세요.";

  try {
    // ✅ 로컬 Flask (or Hugging Face) 백엔드 주소
    const response = await fetch("http://127.0.0.1:7860/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("서버 응답 오류: " + response.status);
    }

    const data = await response.json();

    if (data.error) {
      resultText.textContent = "❌ 오류 발생: " + data.error;
      return;
    }

    resultText.innerHTML = `<b>${data.diagnosis}</b> (Risk Index: ${data.risk_index})`;

    // 표 업데이트
    const table = document.getElementById("resultTable");
    table.innerHTML = `
      <tr><th>항목</th><th>측정값(%)</th><th>정상기준(%)</th><th>편차(%)</th></tr>
      ${Object.keys(data.ratios).map(k => `
        <tr>
          <td>${k}</td>
          <td>${(data.ratios[k]*100).toFixed(1)}</td>
          <td>${(data.normal_ranges[k]*100).toFixed(1)}</td>
          <td>${(data.deviation[k]*100).toFixed(1)}</td>
        </tr>
      `).join("")}
    `;

    // 그래프
    const ctx = document.getElementById("riskChart").getContext("2d");
    if (window.riskChart) window.riskChart.destroy(); // 중복 방지
    window.riskChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(data.ratios),
        datasets: [
          {
            label: "측정값(%)",
            data: Object.values(data.ratios).map(v => v * 100),
            backgroundColor: "rgba(0, 102, 204, 0.6)"
          },
          {
            label: "정상기준(%)",
            data: Object.values(data.normal_ranges).map(v => v * 100),
            backgroundColor: "rgba(102, 204, 255, 0.3)"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "top" } },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "비율 (%)" }
          }
        }
      }
    });

    // segmentation 이미지 표시
    const segImg = document.getElementById("segmentationResult");
    segImg.src = `data:image/png;base64,${data.segmented_image}`;

  } catch (err) {
    console.error(err);
    alert("서버 통신 오류: " + err.message);
  }
});
