document.addEventListener("DOMContentLoaded", () => {
  const uploadInput = document.getElementById("imageUpload");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const preview = document.getElementById("imagePreview");
  const resultText = document.getElementById("resultText");
  const resultTable = document.getElementById("resultTable");
  const chartCanvas = document.getElementById("riskChart");
  const segmentedImg = document.getElementById("segmentationResult");

  let chart = null;

  function safeFloat(x) {
    const v = parseFloat(x);
    return isNaN(v) ? 0 : v;
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
    chartCanvas.style.display = "none";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://okas2000-nasal-ai-backend.hf.space/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
      const data = await res.json();

      resultText.innerHTML = `<b>${data.diagnosis}</b><br>📊 위험도: ${(data.risk_index * 100).toFixed(1)}%`;

      const ratios = data.ratios;
      const normals = data.normal_cutoff;
      const deviations = data.deviation;

      resultTable.innerHTML = `
        <tr><th>항목</th><th>비율(%)</th><th>정상컷(%)</th><th>편차(%)</th></tr>
        ${Object.keys(ratios).map(k => `
          <tr>
            <td>${k}</td>
            <td>${(ratios[k]*100).toFixed(1)}</td>
            <td>${(normals[k]*100).toFixed(1)}</td>
            <td style="color:${deviations[k]>0?'red':'green'}">${(deviations[k]*100).toFixed(1)}</td>
          </tr>
        `).join("")}
      `;

      // 그래프
      const ctx = chartCanvas.getContext("2d");
      chartCanvas.style.display = "block";

      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(ratios),
          datasets: [
            {
              label: "실측값(%)",
              data: Object.values(ratios).map(x => x*100),
              backgroundColor: "rgba(54,162,235,0.6)",
            },
            {
              label: "정상 기준선(%)",
              data: Object.values(normals).map(x => x*100),
              type: "line",
              borderColor: "rgba(255,99,132,1)",
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "비율 (%)" }
            }
          }
        }
      });

      if (data.segmented_image_base64)
        segmentedImg.src = "data:image/png;base64," + data.segmented_image_base64;
    } catch (err) {
      console.error(err);
      resultText.textContent = "❌ 분석 실패: " + err.message;
    }
  });
});
