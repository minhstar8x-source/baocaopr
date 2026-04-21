import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Biểu tượng SVG tích hợp sẵn
 */
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconPrinter = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconX = ({ size = 16 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconLoader = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>;

// Định nghĩa kiểu dữ liệu
interface Activity {
  num: string;
  title: string;
  desc: string;
}

interface ChartItem {
  label: string;
  value: number;
}

// Cấu hình Firebase
// @ts-ignore
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyBllIpvOYLK0aTPyFcTiwGXPjS6XeiaJEU",
    authDomain: "baocaopr.firebaseapp.com",
    projectId: "baocaopr",
    storageBucket: "baocaopr.firebasestorage.app",
    messagingSenderId: "227100318852",
    appId: "1:227100318852:web:2379deb98bca81993db6d1"
};

// @ts-ignore
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pr-strategy-app';
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [status, setStatus] = useState('NGOẠI TUYẾN');
  const [libsReady, setLibsReady] = useState(false);

  // App State
  const [headerTitle, setHeaderTitle] = useState('BÁO CÁO CHIẾN DỊCH TRUYỀN THÔNG');
  const [projectInfo, setProjectInfo] = useState('DỰ ÁN: THE WIN CITY | TUẦN 14 - 2026');
  const [reportDate, setReportDate] = useState('15/04/2026');
  const [chartMainTitle, setChartMainTitle] = useState('BÁO CÁO NGÂN SÁCH');
  const [chartSubTitle, setChartSubTitle] = useState('Phân bổ thực tế');
  const [masterBudget, setMasterBudget] = useState(6230000000);
  const [chartData, setChartData] = useState<ChartItem[]>([
    { label: 'Tháng 1', value: 1200000000 },
    { label: 'Tháng 2', value: 1500000000 }
  ]);
  const [activities, setActivities] = useState<Activity[]>([
    { num: '01', title: 'BOOKING BÁO CHÍ', desc: 'Lên bài trên VnExpress, Tuổi Trẻ về tiến độ dự án.' }
  ]);
  const [activityFontSize, setActivityFontSize] = useState(1);

  const mainSlideRef = useRef<HTMLDivElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // 1. Nạp thư viện ngoài theo thứ tự chính xác
  useEffect(() => {
    const loadScript = (url: string) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = false; 
        script.crossOrigin = "anonymous";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    };

    const initLibs = async () => {
      const chartLoaded = await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
      if (chartLoaded) {
        await loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        setLibsReady(true);
      }
    };

    initLibs();
  }, []);

  // 2. Logic Xác thực Firebase
  useEffect(() => {
    const initAuth = async () => {
      try {
        // @ts-ignore
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            // @ts-ignore
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setStatus('ĐÃ KẾT NỐI');
    });
    return () => unsubscribe();
  }, []);

  // 3. Lắng nghe Firestore
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'budget', 'dashboard');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.headerTitle) setHeaderTitle(data.headerTitle);
        if (data.projectInfo) setProjectInfo(data.projectInfo);
        if (data.reportDate) setReportDate(data.reportDate);
        if (data.chartMainTitle) setChartMainTitle(data.chartMainTitle);
        if (data.chartSubTitle) setChartSubTitle(data.chartSubTitle);
        if (data.masterBudget !== undefined) setMasterBudget(data.masterBudget);
        if (data.chartData) setChartData(data.chartData);
        if (data.activities) setActivities(data.activities);
        if (data.activityFontSize) setActivityFontSize(data.activityFontSize);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Load Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Hàm định dạng số tiền
  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const parseNumber = (str: string) => parseInt(str.toString().replace(/\./g, '')) || 0;
  const smartFormat = (v: number) => {
    if (v >= 1000000000) return (v / 1000000000).toFixed(1).replace('.0', '') + ' Tỷ';
    return (v / 1000000) + ' Tr';
  };

  // 4. Khởi tạo Biểu đồ ĐẸP MẮT & CHUẨN XÁC
  useEffect(() => {
    if (libsReady && chartCanvasRef.current && chartData.length > 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      // @ts-ignore
      const Chart = window.Chart;
      // @ts-ignore
      const ChartDataLabels = window.ChartDataLabels;

      if (!Chart || !ChartDataLabels) return;

      const ctx = chartCanvasRef.current.getContext('2d');
      if (!ctx) return;

      // Tính toán giá trị lớn nhất để thêm khoảng trống bên phải cho datalabel không bị cắt
      const maxValue = Math.max(...chartData.map(d => d.value));
      const axisMax = maxValue * 1.25;

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
          labels: chartData.map(d => d.label),
          datasets: [{
            data: chartData.map(d => d.value),
            backgroundColor: '#ea580c', // Màu cam chuẩn Tailwind orange-600
            borderRadius: 8,
            barPercentage: 0.65, // Độ dày của cột chuẩn xác hơn
            borderSkipped: false,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { right: 40 } // Chừa chỗ cho label
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              callbacks: {
                label: function(context: any) {
                  return formatNumber(context.raw) + ' VNĐ';
                }
              }
            },
            datalabels: {
              align: 'right',
              anchor: 'end',
              offset: 8,
              color: '#ea580c', // Label đồng màu với cột
              font: { family: 'Be Vietnam Pro', weight: 'bold', size: 13 },
              formatter: (v: number) => smartFormat(v)
            }
          },
          scales: {
            x: { 
              beginAtZero: true, 
              max: axisMax, // Mở rộng không gian trục X
              grid: { color: '#f1f5f9', drawBorder: false },
              ticks: { font: { family: 'Be Vietnam Pro', size: 11, weight: '500' }, color: '#64748b', callback: (v: any) => smartFormat(v) }
            },
            y: { 
              grid: { display: false, drawBorder: false },
              ticks: { font: { family: 'Be Vietnam Pro', weight: 'bold', size: 12 }, color: '#334155' }
            }
          }
        }
      });
    }
  }, [libsReady, chartData]);

  // Đồng bộ Firestore
  const syncToFirebase = async (updates: any = {}) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'budget', 'dashboard');
    try {
      await setDoc(docRef, {
        headerTitle,
        projectInfo,
        reportDate,
        chartMainTitle,
        chartSubTitle,
        masterBudget,
        chartData,
        activities,
        activityFontSize,
        lastUpdated: new Date().toISOString(),
        ...updates
      }, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error);
    }
  };

  const usedSum = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const handleExportImage = async () => {
    if (!mainSlideRef.current) return;
    // @ts-ignore
    if (!window.html2canvas) {
      alert("Thư viện đang tải, vui lòng thử lại.");
      return;
    }
    setExporting(true);
    try {
      // @ts-ignore
      const canvas = await window.html2canvas(mainSlideRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 1280,
        height: 720
      });
      const link = document.createElement('a');
      link.download = `PR-Dashboard-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export Error:", e);
    } finally {
      setExporting(false);
    }
  };

  if ((loading && status === 'NGOẠI TUYẾN') || !libsReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 font-['Be_Vietnam_Pro']">
        <IconLoader className="animate-spin text-orange-500 w-10 h-10" />
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Đang khởi tạo Dashboard...</p>
      </div>
    );
  }

  return (
    // THAY ĐỔI QUAN TRỌNG: overflow-auto thay vì overflow-hidden để trên Vercel không bị mất nội dung
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 overflow-auto dashboard-root">
      
      {exporting && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <IconLoader className="animate-spin h-12 w-12 text-orange-500 mb-4" />
          <p className="uppercase tracking-widest text-xs font-bold">Đang tối ưu & xuất hình ảnh...</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="fixed top-6 right-6 flex flex-col gap-3 z-50 print:hidden">
        <button onClick={() => window.print()} className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2">
          <IconPrinter /> XUẤT PDF
        </button>
        <button onClick={handleExportImage} className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2">
          <IconImage /> XUẤT HÌNH ẢNH
        </button>
        <button onClick={() => setShowDrawer(true)} className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2">
          <IconEdit /> SỬA DỮ LIỆU
        </button>
      </div>

      {/* Main Slide Content - THAY ĐỔI QUAN TRỌNG: min-w-[1280px] min-h-[720px] shrink-0 để không bị bóp méo */}
      <div 
        ref={mainSlideRef} 
        className="bg-white w-[1280px] h-[720px] min-w-[1280px] min-h-[720px] shrink-0 shadow-2xl relative flex flex-col overflow-hidden"
      >
        <header className="flex items-center justify-between px-10 py-6 border-b border-slate-50 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-6">
            <div className="bg-orange-600 text-white px-8 py-3 rounded-full shadow-lg shadow-orange-100">
              <h1 contentEditable suppressContentEditableWarning onBlur={(e) => { setHeaderTitle(e.currentTarget.innerText); syncToFirebase({headerTitle: e.currentTarget.innerText}); }} className="text-xl font-black tracking-tighter uppercase outline-none whitespace-nowrap">
                {headerTitle}
              </h1>
            </div>
            <p contentEditable suppressContentEditableWarning onBlur={(e) => { setProjectInfo(e.currentTarget.innerText); syncToFirebase({projectInfo: e.currentTarget.innerText}); }} className="text-orange-600 font-bold text-[10px] tracking-[0.2em] uppercase outline-none whitespace-nowrap">
              {projectInfo}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${status === 'ĐÃ KẾT NỐI' ? 'text-emerald-500' : 'text-slate-300'}`}>
              {status}
            </div>
            <div contentEditable suppressContentEditableWarning onBlur={(e) => { setReportDate(e.currentTarget.innerText); syncToFirebase({reportDate: e.currentTarget.innerText}); }} className="text-lg font-bold text-slate-700 outline-none whitespace-nowrap">
              {reportDate}
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Activity Column */}
          <div className="flex flex-col p-10 border-r border-slate-100 h-full" style={{ flex: '0 0 58%' }}>
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h2 className="text-[12px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-6 bg-orange-600"></span> Hoạt động triển khai tuần vừa qua
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 print:hidden">
                  <span className="text-[9px] font-bold text-slate-400">SIZE</span>
                  <input type="range" min="0.5" max="1.5" step="0.05" value={activityFontSize} onChange={(e) => { setActivityFontSize(parseFloat(e.target.value)); syncToFirebase({activityFontSize: parseFloat(e.target.value)}); }} className="w-20 accent-orange-600 cursor-pointer" />
                </div>
                <button onClick={() => { const n = [...activities, { num: 'X', title: 'MỤC MỚI', desc: 'Mô tả...' }]; setActivities(n); syncToFirebase({activities: n}); }} className="text-orange-600 hover:bg-orange-50 p-2 rounded-xl transition print:hidden">
                  <IconPlus />
                </button>
              </div>
            </div>

            <div className="space-y-5 overflow-y-auto pr-4 custom-scroll pb-10">
              {activities.map((act, idx) => (
                <div key={idx} className="flex items-start gap-6 relative group">
                  <div contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].num = e.currentTarget.innerText; setActivities(n); syncToFirebase({activities: n}); }} className="font-black text-orange-600 leading-none outline-none" style={{ fontSize: `${3 * activityFontSize}rem`, minWidth: '70px' }}>
                    {act.num}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].title = e.currentTarget.innerText; setActivities(n); syncToFirebase({activities: n}); }} className="font-extrabold text-slate-800 uppercase mb-1 outline-none" style={{ fontSize: `${1.1 * activityFontSize}rem` }}>
                      {act.title}
                    </h3>
                    <p contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].desc = e.currentTarget.innerText; setActivities(n); syncToFirebase({activities: n}); }} className="text-slate-500 leading-relaxed outline-none" style={{ fontSize: `${0.9 * activityFontSize}rem` }}>
                      {act.desc}
                    </p>
                  </div>
                  <button onClick={() => { const n = activities.filter((_, i) => i !== idx); setActivities(n); syncToFirebase({activities: n}); }} className="absolute -right-2 top-0 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition print:hidden">
                    <IconX size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chart & Budget Column */}
          <div className="flex-1 p-10 flex flex-col bg-slate-50/30 h-full">
            <div className="flex justify-between items-start mb-8 shrink-0">
              <div className="flex flex-col gap-1">
                <h2 contentEditable suppressContentEditableWarning onBlur={(e) => { setChartMainTitle(e.currentTarget.innerText); syncToFirebase({chartMainTitle: e.currentTarget.innerText}); }} className="text-2xl font-black text-slate-800 tracking-tighter uppercase outline-none whitespace-nowrap">{chartMainTitle}</h2>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => { setChartSubTitle(e.currentTarget.innerText); syncToFirebase({chartSubTitle: e.currentTarget.innerText}); }} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic outline-none whitespace-nowrap">{chartSubTitle}</p>
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-right shrink-0">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">DỰ KIẾN (VNĐ)</p>
                <input className="text-xl font-black text-orange-600 bg-transparent text-right outline-none w-40" value={formatNumber(masterBudget)} onChange={(e) => { const v = parseNumber(e.target.value); setMasterBudget(v); syncToFirebase({masterBudget: v}); }} />
              </div>
            </div>

            <div className="flex-1 bg-white rounded-[40px] p-6 border border-slate-100 shadow-sm relative min-h-0">
              <canvas ref={chartCanvasRef}></canvas>
            </div>

            <div className="mt-8 flex gap-4 shrink-0">
              <div className="bg-white border border-slate-100 p-6 rounded-3xl flex-1 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">ĐÃ CHI (VNĐ)</p>
                <p className="text-xl font-black text-slate-900 truncate">{formatNumber(usedSum)}</p>
              </div>
              <div className="bg-emerald-600 p-6 rounded-3xl flex-1 shadow-xl shadow-emerald-100">
                <p className="text-[9px] font-black text-emerald-100 uppercase mb-2">CÒN LẠI (VNĐ)</p>
                <p className="text-xl font-black text-white truncate">{formatNumber(masterBudget - usedSum)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-3 bg-orange-600 w-full shrink-0"></div>
      </div>

      {/* Data Editor Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-6 bg-slate-900/40 backdrop-blur-sm print:hidden">
          <div className="bg-white w-[600px] h-full rounded-3xl shadow-2xl p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <h3 className="font-black text-slate-800 uppercase tracking-widest">Dữ liệu biểu đồ</h3>
              <button onClick={() => setShowDrawer(false)} className="text-slate-400 hover:text-slate-900"><IconX size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs font-bold uppercase border-b">
                    <th className="text-left py-3 w-1/3">Danh mục</th>
                    <th className="text-right py-3 w-1/4">Số tiền</th>
                    <th className="text-right py-3 w-1/4">Cộng thêm</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="py-3">
                        <input className="w-full font-bold text-slate-700 outline-none bg-slate-50 px-2 py-2 rounded-xl" value={item.label} onChange={(e) => { const n = [...chartData]; n[idx].label = e.target.value; setChartData(n); syncToFirebase({chartData: n}); }} />
                      </td>
                      <td className="py-3 text-right">
                        <input className="text-right font-black text-orange-600 outline-none bg-slate-50 px-2 py-2 rounded-xl w-full" value={formatNumber(item.value)} onChange={(e) => { const n = [...chartData]; n[idx].value = parseNumber(e.target.value); setChartData(n); syncToFirebase({chartData: n}); }} />
                      </td>
                      <td className="py-3 text-right pl-2">
                        <input placeholder="+0" className="w-full text-right font-bold text-emerald-600 bg-emerald-50 px-2 py-2 rounded-xl outline-none border border-emerald-100" onBlur={(e) => { const v = parseNumber(e.currentTarget.value); if(v>0){ const n=[...chartData]; n[idx].value+=v; setChartData(n); syncToFirebase({chartData:n}); e.currentTarget.value=''; } }} />
                      </td>
                      <td className="text-right pl-2">
                        <button onClick={() => { const n = chartData.filter((_, i) => i !== idx); setChartData(n); syncToFirebase({chartData: n}); }} className="text-slate-300 hover:text-red-500"><IconX size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => { const n = [...chartData, { label: 'Mục mới', value: 0 }]; setChartData(n); syncToFirebase({chartData: n}); }} className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:border-orange-300 hover:text-orange-600 transition uppercase">+ THÊM DÒNG MỚI</button>
            </div>
            <button onClick={() => setShowDrawer(false)} className="mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-600 transition">HOÀN TẤT</button>
          </div>
        </div>
      )}

      {/* Font & Global Styling được nạp cứng qua CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap');
        
        .dashboard-root, .dashboard-root * {
          font-family: 'Be Vietnam Pro', sans-serif !important;
        }
        
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        @media print {
          body { background: white !important; padding: 0 !important; }
          .min-h-screen { background: white !important; }
        }
      `}} />
    </div>
  );
}