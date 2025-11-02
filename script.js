document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const file = document.getElementById("imageUpload").files[0];
  if (!file) {
    alert("이미지를 업로드하세요!");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const resultText = document.getElementById("resultText");
  resultText.textContent = "🧠 AI 분석 중...";

  try {
    const backendURL = window.location.origin + "/analyze";
    const response = await fetch(backendURL, { method: "POST", body: formData });

    if (!response.ok) throw new Error("서버 응답 오류: " + response.status);
    const data = await response.json();

    if (data.error) {
      resultText.textContent = "❌ 분석 실패: " + data.error;
      return;
    }

    resultText.innerHTML = `<b>${data.diagnosis}</b> (Risk Index: ${data.risk_index})`;

    // 표 표시
    const table = document.getElementById("resultTable");
    table.innerHTML = `
      <tr><th>항목</th><th>측정값(%)</th><th>정상(%)</th><th>편차(%)</th></tr>
      ${Object.keys(data.ratios).map(k => `
        <tr>
          <td>${k}</td>
          <td>${(data.ratios[k]*100).toFixed(1)}</td>
          <td>${(data.normal_ranges[k]*100).toFixed(1)}</td>
          <td>${(data.deviation[k]*100).toFixed(1)}</td>
        </tr>`).join("")}
    `;

    // 그래프 표시
    const ctx = document.getElementById("riskChart").getContext("2d");
    if (window.riskChart) window.riskChart.destroy();
    window.riskChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(data.ratios),
        datasets: [
          { label: "측정값", data: Object.values(data.ratios).map(v => v * 100), backgroundColor: "rgba(0,102,204,0.6)" },
          { label: "정상 기준", data: Object.values(data.normal_ranges).map(v => v * 100), backgroundColor: "rgba(102,204,255,0.4)" }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { position: "top" } }
      }
    });

    // 결과 이미지
    const segImg = document.getElementById("segmentationResult");
    segImg.src = `data:image/png;base64,${data.segmented_image}`;

  } catch (err) {
    console.error(err);
    resultText.textContent = "❌ 분석 실패: " + err.message;
  }
});
