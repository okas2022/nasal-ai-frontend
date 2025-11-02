const $ = (id) => document.getElementById(id);

let chart;

$("analyzeBtn").addEventListener("click", async () => {
  const file = $("imageUpload").files[0];
  if (!file) return alert("이미지를 업로드하세요!");

  $("status").textContent = "🧠 AI 분석 중…";
  $("summary").textContent = "분석 중…";

  const fd = new FormData();
  fd.append("file", file);

  try {
    const url = window.location.origin + "/analyze";
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error("서버 응답 오류: " + res.status);
    const data = await res.json();

    if (data.error) {
      $("status").textContent = "❌ 실패: " + data.error;
      $("summary").textContent = "오류 발생";
      return;
    }

    $("status").textContent = "완료";
    $("summary").innerHTML = `결과: <b>${data.diagnosis}</b> · 위험지수 ${data.risk_index} · 신뢰도 ${(data.confidence*100).toFixed(1)}%`;

    // 표
    const mk = (v)=> (v*100).toFixed(1) + "%";
    const rows = Object.keys(data.ratios).map(k => `
      <tr>
        <td>${k}</td>
        <td>${mk(data.ratios[k])}</td>
        <td>${mk(data.normal_ranges[k])}</td>
        <td>${mk(data.deviation[k])}</td>
      </tr>
    `).join("");
    $("resultTable").innerHTML = `
      <tr><th>항목</th><th>측정</th><th>정상 기준</th><th>편차</th></tr>
      ${rows}
    `;

    // 그래프
    const labels = Object.keys(data.ratios);
    const vals = labels.map(k => data.ratios[k]*100);
    const norms = labels.map(k => data.normal_ranges[k]*100);

    if (chart) chart.destroy();
    chart = new Chart($("riskChart").getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label:"측정값(%)", data: vals, backgroundColor:"rgba(0,102,204,0.65)" },
          { label:"정상기준(%)", data: norms, backgroundColor:"rgba(102,204,255,0.35)" }
        ]
      },
      options: {
        responsive:true,
        scales:{ y:{ beginAtZero:true, max:100, title:{display:true, text:"비율(%)"} } },
        plugins:{ legend:{ position:"top" } }
      }
    });

    // 이미지
    $("segmentationResult").src = `data:image/png;base64,${data.segmented_image}`;

  } catch (e) {
    console.error(e);
    $("status").textContent = "❌ 실패: " + e.message;
    $("summary").textContent = "서버 통신 오류";
  }
});
