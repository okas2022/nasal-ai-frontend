import React, { useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const BACKEND_URL = 'https://okas2000-nasal-ai-backend.hf.space/api/predict';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async () => {
    if (!file) return alert('이미지를 선택하세요.');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(BACKEND_URL, { method: 'POST', body: formData });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      alert('AI 분석 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const radarData = result ? {
    labels: ['Redness', 'Gloss', 'Narrowness'],
    datasets: [{
      label: 'Feature Index (0~1)',
      data: [result.redness_index || 0, result.gloss_ratio || 0, result.narrowness || 0],
      backgroundColor: 'rgba(54,162,235,0.2)',
      borderColor: 'rgba(54,162,235,1)',
      borderWidth: 2,
    }],
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">
        연세대학교 청각재활연구소 AI 비강 분석기
      </h1>

      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">비강 이미지 업로드</h2>
        <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? '분석 중...' : 'AI 분석 시작'}
        </button>
      </div>

      {result && (
        <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">AI 분석 결과</h2>
          <p><strong>진단:</strong> {result.diagnosis}</p>
          <p><strong>확신도:</strong> {(result.confidence * 100).toFixed(1)}%</p>
          <p><strong>비후 등급:</strong> {result.hypertrophy_grade}</p>
          <p><strong>협착도:</strong> {(result.narrowness * 100).toFixed(1)}%</p>

          {radarData && (
            <div className="mt-6">
              <Radar data={radarData} options={{ scales: { r: { min: 0, max: 1 } } }} />
            </div>
          )}

          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-2">세부 지표</h3>
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead><tr><th>지표명</th><th>값</th></tr></thead>
              <tbody>
                <tr><td>홍조지수</td><td>{(result.redness_index * 100).toFixed(1)}%</td></tr>
                <tr><td>광택비율</td><td>{(result.gloss_ratio * 100).toFixed(1)}%</td></tr>
                <tr><td>밝기</td><td>{(result.brightness * 100).toFixed(1)}%</td></tr>
                <tr><td>엔트로피</td><td>{(result.entropy * 100).toFixed(1)}%</td></tr>
                <tr><td>에지밀도</td><td>{(result.edge_density * 100).toFixed(1)}%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
