import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Biểu tượng SVG tích hợp sẵn
 */
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconPrinter = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
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
  const [scale, setScale] = useState(1);
  
  // TÍNH NĂNG RESIZER: State lưu phần trăm độ rộng của cột trái
  const [leftColWidth, setLeftColWidth] = useState(58);

  // App State
  const [headerTitle, setHeaderTitle] = useState('BÁO CÁO CHIẾN DỊCH TRUYỀN THÔNG');
  const [projectInfo, setProjectInfo] = useState('DỰ ÁN: THE WIN CITY | TUẦN 14 - 2026');
  const [reportDate, setReportDate] = useState('15/04/2026');
  const [chartMainTitle, setChartMainTitle] = useState('BÁO CÁO NGÂN SÁCH');
  const [chartSubTitle, setChartSubTitle] = useState('Phân bổ thực tế');
  const [masterBudget, setMasterBudget] = useState(6230000000);
  const [chartData, setChartData] = useState<ChartItem[]>([
    { label: 'Tháng 10/2025', value: 45178560 },
    { label: 'Tháng 11/2025', value: 89132400 },
    { label: 'Tháng 12/2025', value: 824066460 },
    { label: 'Tháng 01/2026', value: 437576580 },
    { label: 'Tháng 02/2026', value: 216775440 },
    { label: 'Tháng 03/2026', value: 236212200 },
    { label: 'Tháng 04/2026', value: 147976200 }
  ]);
  const [activities, setActivities] = useState<Activity[]>([
    { num: '01', title: 'TUYẾN NỘI DUNG - 3 ĐẦU BÁO', desc: 'TÂY SÀI GÒN - HUB TĂNG TRƯỞNG MỚI ĐỌC VỊ DÒNG TIỀN TỪ QUY HOẠCH' },
    { num: '18', title: 'POST SEEDING', desc: '- LỄ KHỞI CÔNG HỒ BƠI MAXIMUS ĐẠT CHUẨN OLYMPIC - THE WIN CITY\n- SỰ KIỆN GIỚI THIỆU DỰ ÁN THE WIN CITY\n- THE WIN CITY: "NHIỆT" CÔNG TRƯỜNG VƯỢT NẮNG THÁNG 4' },
    { num: '02', title: 'KẾ HOẠCH', desc: 'LÀM VIỆC VS NCC BOOKING PR TUẦN 3/ THÁNG 4' },
    { num: '03', title: 'EVENT', desc: '- 2 BẢN MCS (SỰ KIỆN KHỞI CÔNG & MINI EVENT)\n- BÀI PHÁT BIỂU ANH THẾ ANH' }
  ]);
  const [activityFontSize, setActivityFontSize] = useState(1);

  const mainSlideRef = useRef<HTMLDivElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  
  // Refs cho Resizer
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  // 0. Xử lý Logic Resizer (Kéo thả)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !contentWrapperRef.current) return;
      const rect = contentWrapperRef.current.getBoundingClientRect();
      const p = ((e.clientX - rect.left) / rect.width) * 100;
      
      if (p > 20 && p < 80) {
        setLeftColWidth(p);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 0. Thu phóng (Auto-Scale) vừa màn hình
  useEffect(() => {
    const calculateScale = () => {
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      // Dùng Math.min để luôn thấy hết được toàn bộ nội dung mà không bị cắt
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // 1. Nạp thư viện ngoài
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
        await loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0');
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

  const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const parseNumber = (str: string) => parseInt(str.toString().replace(/\./g, '')) || 0;
  const smartFormat = (v: number) => {
    if (v >= 1000000000) return (v / 1000000000).toFixed(1).replace('.0', '') + ' Tỷ';
    return (v / 1000000) + ' Tr';
  };

  // 4. Khởi tạo Biểu đồ
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

      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
          labels: chartData.map(d => d.label),
          datasets: [{
            data: chartData.map(d => d.value),
            backgroundColor: (context: any) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return 'rgba(234, 88, 12, 0.5)';
              const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
              gradient.addColorStop(0, 'rgba(234, 88, 12, 0.15)');
              gradient.addColorStop(1, 'rgba(234, 88, 12, 0.75)');
              return gradient;
            },
            borderRadius: { topRight: 14, bottomRight: 14 },
            borderSkipped: false,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { 
            padding: { left: 10, right: 50, top: 10, bottom: 10 } 
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
              align: 'end',
              anchor: 'end',
              offset: 12,
              color: '#1e293b',
              font: { family: 'Be Vietnam Pro', weight: '800', size: 9 },
              formatter: (v: number) => smartFormat(v),
              clip: false
            }
          },
          scales: {
            x: { 
              beginAtZero: true, 
              grid: { color: '#f1f5f9', drawBorder: false },
              ticks: { font: { family: 'Be Vietnam Pro', size: 9, weight: '700' }, callback: (v: any) => smartFormat(v) }
            },
            y: { 
              grid: { display: false },
              ticks: { 
                font: { family: 'Be Vietnam Pro', weight: '800', size: 10 },
                align: 'end',
                crossAlign: 'center',
                padding: 15
              }
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
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 1280,
        height: 720,
        windowWidth: 1280,
        windowHeight: 720,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `PR-Dashboard-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (e) {
      console.error("Export Error:", e);
    } finally {
      setExporting(false);
    }
  };

  if ((loading && status === 'NGOẠI TUYẾN') || !libsReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4 font-['Be_Vietnam_Pro'] text-left" style={{ backgroundColor: '#0f172a' }}>
        <IconLoader className="animate-spin text-orange-500 w-10 h-10" />
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Đang khởi tạo Dashboard...</p>
      </div>
    );
  }

  return (
    <div 
      className="dashboard-root text-left"
      style={{
        backgroundColor: '#0f172a',
        position: 'fixed', // KHÓA CỨNG MÀN HÌNH TẠI CHỖ
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // CHẮC CHẮN KHÔNG CHO PHÉP CUỘN
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

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

      {/* GIẢI PHÁP TRIỆT ĐỂ: Khung ảo thay đổi kích thước linh hoạt, bên trong thu nhỏ đúng tỷ lệ mà không báo tràn nội dung ra ngoài. */}
      <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1280px',
          height: '720px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}>
          {/* Main Slide Content */}
          <div 
            ref={mainSlideRef} 
            className="slide-container shadow-2xl text-left"
            style={{
              width: '100%',
              height: '100%',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              userSelect: 'none',
              overflow: 'hidden',
              textAlign: 'left'
            }}
          >
            <header className="flex items-center justify-between px-10 py-5 flex-none border-b border-slate-50 bg-slate-50/30 overflow-visible text-left">
              <div className="flex items-center gap-6 flex-none">
                <div className="bg-orange-600 text-white px-8 py-2.5 rounded-full shadow-lg shadow-orange-50">
                  <h1 contentEditable suppressContentEditableWarning onBlur={(e) => { setHeaderTitle(e.currentTarget.innerText); syncToFirebase({headerTitle: e.currentTarget.innerText}); }} className="text-xl font-black tracking-tighter uppercase editable leading-none">
                    {headerTitle}
                  </h1>
                </div>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => { setProjectInfo(e.currentTarget.innerText); syncToFirebase({projectInfo: e.currentTarget.innerText}); }} className="text-orange-600 font-bold text-[10px] tracking-[0.2em] editable uppercase leading-none">
                  {projectInfo}
                </p>
              </div>
              <div className="text-right flex-none">
                <div className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${status === 'ĐÃ KẾT NỐI' ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {status}
                </div>
                <div contentEditable suppressContentEditableWarning onBlur={(e) => { setReportDate(e.currentTarget.innerText); syncToFirebase({reportDate: e.currentTarget.innerText}); }} className="text-lg font-bold text-slate-700 editable leading-none">
                  {reportDate}
                </div>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden text-left" id="contentWrapper" ref={contentWrapperRef}>
              {/* Left Column (Được áp dụng biến state leftColWidth) */}
              <div className="flex flex-col p-8 overflow-visible border-r border-slate-100" style={{ flex: `0 0 ${leftColWidth}%` }}>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-[12px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2 leading-none text-left">
                      <span className="inline-block w-1.5 h-6 bg-orange-600 align-middle"></span>
                      <span className="align-middle">Hoạt động triển khai tuần vừa qua</span>
                    </h2>
                    <div className="print:hidden flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400">SIZE</span>
                      <input type="range" min="0.5" max="1.5" step="0.05" value={activityFontSize} onChange={(e) => { setActivityFontSize(parseFloat(e.target.value)); syncToFirebase({activityFontSize: parseFloat(e.target.value)}); }} className="w-20 h-1 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                    </div>
                  </div>
                  <button onClick={() => { const n = [...activities, { num: 'X', title: 'MỤC MỚI', desc: 'Mô tả...' }]; setActivities(n); syncToFirebase({activities: n}); }} className="print:hidden text-orange-600 hover:bg-orange-50 p-1.5 rounded-lg transition">
                    <IconPlus />
                  </button>
                </div>

                <div className="space-y-1 flex-1 overflow-y-auto pr-4 custom-scroll text-left" style={{ '--activity-font-scale': activityFontSize } as React.CSSProperties}>
                  {activities.map((act, idx) => (
                    <div key={idx} className="activity-block group text-left">
                      <div contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].num = e.currentTarget.innerText; setActivities(n); syncToFirebase({activities: n}); }} className="activity-num editable text-left">
                        {act.num}
                      </div>
                      <div className="activity-content text-left">
                        <h3 contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].title = e.currentTarget.innerText; setActivities(n); syncToFirebase({activities: n}); }} className="activity-title editable text-left">
                          {act.title}
                        </h3>
                        <p contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].desc = e.currentTarget.innerText; setActivities(n); syncToFirebase({activities: n}); }} className="activity-desc editable text-left">
                          {act.desc}
                        </p>
                      </div>
                      <button onClick={() => { const n = activities.filter((_, i) => i !== idx); setActivities(n); syncToFirebase({activities: n}); }} className="print:hidden absolute -right-2 top-0 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                        <IconX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* TÍNH NĂNG RESIZER CO KÉO DIỆN TÍCH */}
              <div 
                className="resizer-v print:hidden"
                onMouseDown={(e) => {
                  e.preventDefault();
                  isResizingRef.current = true;
                }}
              ></div>

              {/* Right Column */}
              <div className="flex flex-col flex-1 pr-10 py-6 min-w-0 overflow-visible text-left">
                <div className="flex items-start justify-between mb-8 px-2 gap-4">
                  <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-visible text-left">
                    <h2 contentEditable suppressContentEditableWarning onBlur={(e) => { setChartMainTitle(e.currentTarget.innerText); syncToFirebase({chartMainTitle: e.currentTarget.innerText}); }} className="text-xl font-black text-slate-800 tracking-tighter uppercase editable leading-none text-left">
                      {chartMainTitle}
                    </h2>
                    <p contentEditable suppressContentEditableWarning onBlur={(e) => { setChartSubTitle(e.currentTarget.innerText); syncToFirebase({chartSubTitle: e.currentTarget.innerText}); }} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic editable leading-none text-left">
                      {chartSubTitle}
                    </p>
                  </div>
                  <div className="budget-card-slim shadow-sm flex-none text-left">
                    <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest editable leading-none mb-1 text-left" contentEditable suppressContentEditableWarning>DỰ KIẾN (VNĐ)</h3>
                    <input className="number-input-main" value={formatNumber(masterBudget)} onChange={(e) => { const v = parseNumber(e.target.value); setMasterBudget(v); syncToFirebase({masterBudget: v}); }} />
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-3xl p-6 flex flex-col border border-slate-100 flex-1 overflow-visible relative shadow-sm">
                  <div className="flex-1 relative h-full">
                    <canvas ref={chartCanvasRef}></canvas>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 px-2 overflow-visible">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 min-w-0 overflow-visible text-left">
                    <p className="text-[7.5px] font-black text-slate-400 uppercase mb-2 editable leading-none text-left" contentEditable suppressContentEditableWarning>ĐÃ CHI (VNĐ)</p>
                    <p className="adaptive-value font-black text-slate-900 text-left">{formatNumber(usedSum)}</p>
                  </div>
                  <div className="bg-emerald-600 rounded-2xl p-5 shadow-xl shadow-emerald-100/50 text-white flex-1 min-w-0 overflow-visible text-left">
                    <p className="text-[7.5px] font-black text-emerald-100 uppercase mb-2 editable leading-none text-left" contentEditable suppressContentEditableWarning>CÒN LẠI (VNĐ)</p>
                    <p className="adaptive-value font-black text-white text-left">{formatNumber(masterBudget - usedSum)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-orange-600 h-2 w-full flex-none"></div>
          </div>
        </div>
      </div>

      {/* Drawer Cập nhật dữ liệu */}
      {showDrawer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-6 bg-slate-900/40 backdrop-blur-sm print:hidden text-left">
          <div className="bg-white w-[600px] h-full rounded-3xl shadow-2xl p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <h3 className="font-black text-slate-800 uppercase tracking-widest">Dữ liệu biểu đồ</h3>
              <button onClick={() => setShowDrawer(false)} className="text-slate-400 hover:text-slate-900"><IconX size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scroll text-left">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs font-bold uppercase border-b text-left">
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
                        <input className="w-full font-bold text-slate-700 outline-none bg-slate-50 px-2 py-2 rounded-xl text-left" value={item.label} onChange={(e) => { const n = [...chartData]; n[idx].label = e.target.value; setChartData(n); syncToFirebase({chartData: n}); }} />
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

      <style dangerouslySetInnerHTML={{ __html: `
        /* Chặn toàn bộ thanh cuộn ở Body trên Vercel */
        body, html {
          margin: 0;
          padding: 0;
          overflow: hidden !important; 
          background-color: #0f172a;
        }

        .dashboard-root, .dashboard-root * {
          font-family: 'Be Vietnam Pro', sans-serif !important;
          box-sizing: border-box;
          text-align: left; 
        }
        
        .editable { 
            user-select: text; 
            white-space: pre-wrap; 
            word-break: break-word;
            line-height: 1.2;
            text-align: left;
        }
        .editable:hover {
            background-color: #fff7ed;
            border-radius: 4px;
            cursor: text;
        }
        .editable:focus {
            outline: none;
            border-bottom: 2px solid #ea580c;
        }

        .activity-block {
            margin-bottom: 0.5rem;
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 8px 0;
            text-align: left;
        }

        .activity-num {
            color: #ea580c;
            font-weight: 900;
            font-size: calc(3rem * var(--activity-font-scale, 1));
            line-height: 1;
            min-width: 65px;
            text-align: left !important;
            flex-shrink: 0;
            opacity: 0.9;
            text-shadow: 2px 2px 0px rgba(154, 52, 18, 0.15);
        }

        .activity-content {
            flex: 1;
            padding-top: 2px;
            text-align: left;
        }

        .activity-title {
            font-size: calc(1.05rem * var(--activity-font-scale, 1)); 
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            margin-bottom: 3px;
            line-height: 1.2;
            text-align: left;
        }

        .activity-desc {
            font-size: calc(0.85rem * var(--activity-font-scale, 1)); 
            color: #475569;
            line-height: 1.4;
            text-align: left;
        }

        .budget-card-slim {
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            padding: 8px 14px;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            width: fit-content;
            text-align: left;
        }

        .number-input-main {
            text-align: left !important;
            background: transparent;
            border: none;
            font-weight: 900;
            color: #ea580c;
            font-size: 1.35rem;
            outline: none;
            width: 200px;
            line-height: 1;
        }

        .adaptive-value {
            font-size: clamp(0.9rem, 1.5vw, 1.25rem);
            line-height: 1;
            white-space: nowrap; 
            overflow: visible;
        }
            
        /* CSS CHO TÍNH NĂNG RESIZER CO KÉO DIỆN TÍCH */
        .resizer-v {
            width: 10px;
            cursor: col-resize;
            background: transparent;
            z-index: 50;
            position: relative;
        }
        .resizer-v::after {
            content: '';
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            height: 60px; width: 2px;
            background: #cbd5e1;
            border-radius: 2px;
            transition: background 0.2s;
        }
        .resizer-v:hover::after, .resizer-v:active::after {
            background: #ea580c;
            width: 4px;
        }

        .text-right { text-align: right !important; }

        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        @media print {
            body { background: white !important; padding: 0 !important; overflow: visible !important; }
            .dashboard-root { background: white !important; padding: 0 !important; display: block; overflow: visible !important; position: static !important; height: auto !important;}
            .slide-container { box-shadow: none !important; border: none !important; transform: scale(1) !important; }
            .resizer-v { display: none !important; }
        }
      `}} />
    </div>
  );
}