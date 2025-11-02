// ==========================
// Yonsei Nasal AI Frontend
// ==========================

// Hugging Face 백엔드 주소 입력 (Space 이름 맞게 수정)
const BASE_URL = "https://okas2000-nasal-ai-backend.hf.space";

const $ = (id) => document.getElementById(id);
let chart;

$("analyzeBtn").addEventListener("click", async () => {
  const file = $("imageUpload").files[0];
  if (!file) {
    alert("📸 이미지를 선택하세요!");
    return;
  }

  $("status").textContent = "🧠 분석 중...";
  $("summary").textContent = "분석 중...";

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);

    const data = await res.json();

    if (data.error) throw new Error(data.error);

    $("status").textContent = "✅ 분석 완료";
    $("summary").innerHTML = `
      <b>진단 결과:</b> ${data.diagnosis}<br>
      <b>위험 지수:</b> ${(data.risk_index * 100).toFixed(1)}% |
      <b>신뢰도:</b> ${(data.confidence * 100).toFixed(1)}%
    `;

    const mk = (v) => (v * 100).toFixed(1) + "%";
    const rows = Object.keys(data.ratios)
      .map(
        (k) => `
        <tr>
          <td>${k}</td>
          <td>${mk(data.ratios[k])}</td>
          <td>${mk(data.normal_ranges[k])}</td>
          <td>${mk(data.deviation[k])}</td>
        </tr>`
      )
      .join("");

    $("resultTable").innerHTML = `
      <tr>
        <th>항목</th>
        <th>측정값</th>
        <th>정상 기준</th>
        <th>편차</th>
      </tr>
      ${rows}
    `;

    const labels = Object.keys(data.ratios);
    const vals = labels.map((k) => data.ratios[k] * 100);
    const norms = labels.map((k) => data.normal_ranges[k] * 100);

    if (chart) chart.destroy();
    chart = new Chart($("riskChart").getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "측정값(%)",
            data: vals,
            backgroundColor: "rgba(0,102,204,0.7)",
          },
          {
            label: "정상 기준(%)",
            data: norms,
            backgroundColor: "rgba(102,204,255,0.3)",
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });

    $("segmentationResult").src = `data:image/png;base64,${data.segmented_image}`;
  } catch (e) {
    console.error(e);
    $("status").textContent = "❌ 실패: " + e.message;
  }
});
