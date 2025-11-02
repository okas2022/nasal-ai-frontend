
const API_URL = "https://okas2000-nasal-ai-backend.hf.space/api/predict";

const $ = (q)=>document.querySelector(q);
let uploadedImageDataUrl = null;

function setLoading(on){
  const btn = $("#analyzeBtn");
  btn.disabled = on;
  btn.innerText = on ? "분석 중..." : "AI 분석 시작";
}

function onFileSelected(e){
  const file = e.target.files[0];
  if(!file){ uploadedImageDataUrl=null; $("#preview").innerHTML="<div class='subtle'>이미지가 없습니다</div>"; return; }
  const reader = new FileReader();
  reader.onload = ()=>{
    uploadedImageDataUrl = reader.result;
    $("#preview").innerHTML = `<img src="${uploadedImageDataUrl}" style="max-width:100%;height:auto;display:block" alt="preview"/>`;
  };
  reader.readAsDataURL(file);
}

async function analyze(){
  const fileInput = $("#fileInput");
  if(!fileInput.files[0]) { alert("이미지를 선택하세요."); return; }
  setLoading(true);
  try{
    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    const res = await fetch(API_URL, { method:"POST", body: fd });
    const data = await res.json();
    renderResult(data);
  }catch(err){
    console.error(err);
    alert("분석 중 오류가 발생했습니다.");
  }finally{
    setLoading(false);
  }
}

function mm(v){ return (v*100).toFixed(1) + "%"; }

function renderResult(r){
  // KPI pills
  $("#kpi").innerHTML = `
   <div class="pill"><div class="subtle">진단</div><div><strong>${r.diagnosis || r.lesion_type || "N/A"}</strong></div></div>
   <div class="pill"><div class="subtle">확신도</div><div><strong>${r.confidence ? (r.confidence*100).toFixed(1)+"%" : "N/A"}</strong></div></div>
   <div class="pill"><div class="subtle">비후 등급</div><div><strong>${r.hypertrophy_grade || "N/A"}</strong></div></div>
   <div class="pill"><div class="subtle">협착도</div><div><strong>${r.narrowness ? mm(r.narrowness) : (r.airway_ratio? mm(1-r.airway_ratio): "N/A")}</strong></div></div>
  `;

  // Table
  $("#detailTable").innerHTML = `
    <table class="table">
      <thead><tr><th>지표</th><th>값</th><th>설명</th></tr></thead>
      <tbody>
        <tr><td>홍조지수</td><td>${r.redness_index!==undefined? mm(r.redness_index): (r.red_mean? mm(r.red_mean):"N/A")}</td><td>점막 염증/혈류 반영</td></tr>
        <tr><td>광택비율</td><td>${r.gloss_ratio!==undefined? mm(r.gloss_ratio):"N/A"}</td><td>분비물/표면 반사</td></tr>
        <tr><td>밝기</td><td>${r.brightness!==undefined? mm(r.brightness):"N/A"}</td><td>조명·노출</td></tr>
        <tr><td>엔트로피</td><td>${r.entropy!==undefined? mm(r.entropy):"N/A"}</td><td>텍스처 다양성</td></tr>
        <tr><td>에지밀도</td><td>${r.edge_density!==undefined? mm(r.edge_density):"N/A"}</td><td>구조 경계 복잡성</td></tr>
        <tr><td>원형도</td><td>${r.circularity!==undefined? r.circularity.toFixed(2):"N/A"}</td><td>폴립 추정 핵심</td></tr>
        <tr><td>세장비</td><td>${r.aspect_ratio!==undefined? r.aspect_ratio.toFixed(2):"N/A"}</td><td>하비갑개 추정</td></tr>
        <tr><td>비강 통로 비율</td><td>${r.airway_ratio!==undefined? mm(r.airway_ratio):"N/A"}</td><td>협착도 역지표</td></tr>
      </tbody>
    </table>
  `;

  // Overlay preview (base64) if present
  if(r.overlay_mask_png_b64){
    const overlayUrl = `data:image/png;base64,${r.overlay_mask_png_b64}`;
    $("#preview").innerHTML = `
      <div style="position:relative;display:inline-block">
        <img src="${uploadedImageDataUrl}" style="max-width:100%;display:block;border-radius:10px;border:1px solid #e5e7eb"/>
        <img src="${overlayUrl}" style="position:absolute;inset:0;max-width:100%;mix-blend:multiply;opacity:.75"/>
      </div>
    `;
  }

  // Radar chart
  const labels = ["Redness","Gloss","Narrow","Texture","Edges","Brightness"];
  const values = [
    r.redness_index ?? r.red_mean ?? 0,
    r.gloss_ratio ?? 0,
    (r.narrowness ?? (r.airway_ratio? 1 - r.airway_ratio: 0)),
    r.entropy ?? 0,
    r.edge_density ?? 0,
    r.brightness ?? 0
  ].map(x=> typeof x==="number" ? x : 0);

  const ctx = document.getElementById('radar').getContext('2d');
  if(window.__radar__) window.__radar__.destroy();
  window.__radar__ = new Chart(ctx, {
    type:'radar',
    data:{
      labels,
      datasets:[{
        label:'Feature Index (0~1)',
        data: values,
        fill:true,
        backgroundColor:'rgba(59,130,246,0.2)',
        borderColor:'rgba(59,130,246,1)',
        pointBackgroundColor:'rgba(59,130,246,1)',
        borderWidth:2
      }]
    },
    options:{
      responsive:true,
      scales:{ r:{ min:0, max:1, ticks:{ stepSize:0.2 } } },
      plugins:{ legend:{ display:false } }
    }
  });
}

window.addEventListener("DOMContentLoaded", ()=>{
  $("#fileInput").addEventListener("change", onFileSelected);
  $("#analyzeBtn").addEventListener("click", analyze);
});
