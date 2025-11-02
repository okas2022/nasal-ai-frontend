// === 설정: 백엔드 URL 저장/불러오기 ===
const backendInput = document.getElementById('backend');
const saveBtn = document.getElementById('saveBackend');
const ANALYZE = document.getElementById('analyzeBtn');
const STATUS = document.getElementById('status');
const FILE = document.getElementById('fileInput');
const PREVIEW = document.getElementById('preview');
const OVERLAY = document.getElementById('overlay');
const TBL = document.getElementById('metricsTable');
const ELAPSED = document.getElementById('elapsed');
const LABEL = document.getElementById('summaryLabel');
const RISK = document.getElementById('riskScore');

let BAR_CHART = null;
function getBackend(){
  return backendInput.value.trim() || localStorage.getItem('nasal_backend') || '';
}
function setBackend(url){
  backendInput.value = url;
  localStorage.setItem('nasal_backend', url);
}
saveBtn.onclick = () => {
  setBackend(backendInput.value.trim());
  STATUS.textContent = '백엔드 URL 저장 완료';
  setTimeout(()=> STATUS.textContent='', 1200);
};

// 초기화
(function init(){
  const saved = localStorage.getItem('nasal_backend') || '';
  backendInput.value = saved;
})();

// 파일 프리뷰
FILE.addEventListener('change', () => {
  const f = FILE.files[0];
  if(!f){ PREVIEW.src=''; return; }
  PREVIEW.src = URL.createObjectURL(f);
});

// 차트 렌더러
function renderBarChart(metrics){
  const ctx = document.getElementById('barChart').getContext('2d');
  const vals = [
    metrics.polyp_area_ratio,
    metrics.secretion_ratio,
    metrics.airway_ratio
  ];
  const labels = ['폴립 면적비', '분비물 비율', '기도 개방비'];
  const thresholds = [
    metrics.thresholds.polyp_area_ratio,
    metrics.thresholds.secretion_ratio,
    metrics.thresholds.airway_ratio_min
  ];

  if(BAR_CHART){ BAR_CHART.destroy(); }
  BAR_CHART = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '측정치',
        data: vals,
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...vals, ...thresholds) * 1.4 || 0.5
        }
      },
      plugins: {
        legend: { display: false },
        annotation: {
          annotations: {
            cut1: { type:'line', scaleID:'y', value: thresholds[0], borderWidth:2, borderColor:'#ff6b6b', label:{display:true, content:'폴립 컷오프'} },
            cut2: { type:'line', scaleID:'y', value: thresholds[1], borderWidth:2, borderColor:'#ffd166', label:{display:true, content:'분비물 컷오프'} },
            cut3: { type:'line', scaleID:'y', value: thresholds[2], borderWidth:2, borderColor:'#5aa0ff', label:{display:true, content:'기도 최소비율'} }
          }
        }
      }
    },
    plugins: [{
      id: 'threshold-lines',
      afterDatasetsDraw: (chart) => {
        // Chart.js v4에서 annotation 플러그인 없이 컷오프 라인 간단히 그리기
        const {ctx, chartArea:{top,bottom,left,right}, scales:{y}} = chart;
        ctx.save();
        const draws = [
          { value: thresholds[0], color:'#ff6b6b' },
          { value: thresholds[1], color:'#ffd166' },
          { value: thresholds[2], color:'#5aa0ff' }
        ];
        draws.forEach(d=>{
          const yC = y.getPixelForValue(d.value);
          ctx.strokeStyle = d.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(left, yC); ctx.lineTo(right, yC); ctx.stroke();
        });
        ctx.restore();
      }
    }]
  });
}

// 표 갱신
function renderTable(metrics){
  const rows = [
    ['폴립 면적비', metrics.polyp_area_ratio, metrics.thresholds.polyp_area_ratio],
    ['분비물 비율', metrics.secretion_ratio, metrics.thresholds.secretion_ratio],
    ['기도 개방비', metrics.airway_ratio, `≥ ${metrics.thresholds.airway_ratio_min}`]
  ];
  TBL.innerHTML = rows.map(r=>`<tr><td>${r[0]}</td><td>${(r[1]*100).toFixed(2)}%</td><td>${typeof r[2]==='number' ? (r[2]*100).toFixed(1)+'%' : r[2]}</td></tr>`).join('');
}

// 분석
ANALYZE.addEventListener('click', async () => {
  const backend = getBackend();
  if(!backend){ STATUS.textContent='백엔드 URL을 입력/저장하세요.'; return; }
  const f = FILE.files[0];
  if(!f){ STATUS.textContent='이미지를 선택하세요.'; return; }

  STATUS.textContent = '🤖 AI 분석중...';
  ANALYZE.disabled = true;

  try{
    const fd = new FormData();
    fd.append('file', f);

    const res = await fetch(`${backend.replace(/\/+$/,'')}/api/predict`, {
      method: 'POST',
      body: fd
    });
    if(!res.ok){
      throw new Error(`서버 응답 오류: ${res.status}`);
    }
    const data = await res.json();
    if(!data.ok){
      throw new Error(data.error || '분석 실패');
    }

    OVERLAY.src = data.overlay_b64 || '';
    ELAPSED.textContent = `${data.elapsed_ms} ms`;
    LABEL.textContent = data.metrics?.summary_label ?? '-';
    RISK.textContent = data.metrics?.risk_score ?? '-';

    renderBarChart(data.metrics);
    renderTable(data.metrics);

    STATUS.textContent = '✅ 분석 완료';
    setTimeout(()=> STATUS.textContent='', 1200);
  }catch(err){
    console.error(err);
    STATUS.textContent = `❌ 분석 실패: ${err.message}`;
  }finally{
    ANALYZE.disabled = false;
  }
});
