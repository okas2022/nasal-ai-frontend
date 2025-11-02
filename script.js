// =====================================================
// 🎯 Yonsei University Nasal AI Analyzer Frontend Script
// =====================================================

// ⚙️ 1️⃣ CONFIGURATION — 백엔드 주소 지정
// Hugging Face Space에서 Flask 백엔드를 실행 중이라면
// 아래 BASE_URL에 Space 주소를 정확히 입력하세요.
// 예: const BASE_URL = "https://okas2022-nasal-ai-backend.hf.space";
//
// 만약 프론트엔드(index.html, script.js)가 같은 서버(Docker 내)에서 실행된다면
// const BASE_URL = "";  로 두면 됩니다.
const BASE_URL = ""; // 동일 서버에서 실행 시 공백 유지

// ⚙️ 2️⃣ 헬퍼 함수
const $ = (id) => document.getElementById(id);
let chart;

// ⚙️ 3️⃣ 버튼 클릭 이벤트
$("analyzeBtn").addEventListener("click", async () => {
  const file = $("imageUpload").files[0];
  if (!file) {
    alert("📸 내시경 이미지를 업로드하세요!");
    return;
  }

  $("status").textContent = "🧠 AI 분석 중입니다...";
  $("summary").textContent = "분석 중...";

  // 전송할 데이터 준비
  const fd = new FormData();
  fd.append("file", file);

  try {
    // Hugging Face 백엔드 URL 자동 선택
    const endpoint = BASE_URL ? `${BASE_URL}/analyze` : `/analyze`;

    // POST 요청 (Flask의 /analyze로 전송)
    const res = await fetch(endpoint, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);

    const data = await res.json();

    // ⚠️ 백엔드 오류 처리
    if (data.error) {
      $("status").textContent = "❌ 실패: " + data.error;
      $("summary").textContent = "오류 발생: " + data.error;
      return;
    }

    // -------------------------------
    // ✅ 결과 표시
    // -------------------------------
    $("status").textContent = "✅ 분석 완료";
    $("summary").innerHTML = `
      <b>진단 결과:</b> ${data.diagnosis}<br>
      <b>위험 지수:</b> ${(data.risk_index * 100).toFixed(1)}% |
      <b>신뢰도:</b> ${(data.confidence * 100).toFixed(1)}%
    `;

    // -------------------------------
    // ✅ 표 데이터 구성
    // -------------------------------
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

    // -------------------------------
    // ✅ 그래프 (Chart.js)
    // -------------------------------
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
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } },
        },
        plugins: {
          legend: { position: "bottom" },
          title: {
            display: true,
            text: "정상 대비 편차 시각화 그래프",
          },
        },
      },
    });

    // -------------------------------
    // ✅ 병변 시각화 이미지
    // -------------------------------
    $("segmentationResult").src = `data:image/png;base64,${data.segmented_image}`;
  } catch (e) {
    console.error(e);
    $("status").textContent = "❌ 분석 실패: " + e.message;
  }
});
