const API_URL = "https://<당신의-huggingface-space>.hf.space/analyze";

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const input = document.getElementById("imageInput");
  const status = document.getElementById("status");
  const container = document.getElementById("resultContainer");

  if (!input.files[0]) {
    alert("이미지를 선택하세요.");
    return;
  }

  status.textContent = "🧠 AI 분석 중...";
  container.classList.add("hidden");

  const formData = new FormData();
  formData.append("image", input.files[0]);

  try {
    const response = await fetch(API_URL, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    const data = await response.json();

    document.getElementById("overlayImage").src = `data:image/png;base64,${data.overlay_image}`;
    document.getElementById("graphImage").src = `data:image/png;base64,${data.graph_image}`;
    document.getElementById("polypRatio").textContent = data.polyp_ratio;
    document.getElementById("mucosaRatio").textContent = data.mucosa_ratio;
    document.getElementById("secretionRatio").textContent = data.secretion_ratio;

    container.classList.remove("hidden");
    status.textContent = "✅ 분석 완료!";
  } catch (err) {
    status.textContent = `❌ 실패: ${err.message}`;
  }
});
