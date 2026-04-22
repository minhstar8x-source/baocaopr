import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Biểu tượng SVG tích hợp sẵn
 */
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconPrinter = ({ size = 18 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const IconEdit = ({ size = 18 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IconX = ({ size = 16 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconMenu = ({ size = 20 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const IconHistory = ({ size = 16 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconTrash = ({ size = 16 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

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

interface ReportVersion {
  id: string;
  timestamp: number;
  name: string;
  payload: any;
}

// Hàm hỗ trợ tính toán thời gian chuẩn Việt Nam và format Tên Tuần
const getVNWeekInfo = () => {
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(now);
  monday.setDate(diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const fullStr = (d: Date) => `${dateStr(d)}/${d.getFullYear()}`;
  
  return {
    id: `${monday.getFullYear()}-${pad(monday.getMonth()+1)}-${pad(monday.getDate())}`,
    name: `Tuần ${dateStr(monday)} - ${fullStr(sunday)}`
  };
};

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
  const [status, setStatus] = useState('NGOẠI TUYẾN');
  const [libsReady, setLibsReady] = useState(false);
  const [scale, setScale] = useState(1);
  
  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  
  // TÍNH NĂNG RESIZER: State lưu phần trăm độ rộng của cột trái
  const [leftColWidth, setLeftColWidth] = useState(58);
  const [triggerSyncWidth, setTriggerSyncWidth] = useState(0);

  // App Data State
  const [headerTitle, setHeaderTitle] = useState('BÁO CÁO CHIẾN DỊCH TRUYỀN THÔNG');
  const [projectInfo, setProjectInfo] = useState('DỰ ÁN: THE WIN CITY | TUẦN 14 - 2026');
  const [reportDate, setReportDate] = useState('15/04/2026');
  const [chartMainTitle, setChartMainTitle] = useState('BÁO CÁO NGÂN SÁCH');
  const [chartSubTitle, setChartSubTitle] = useState('Phân bổ thực tế');
  const [masterBudget, setMasterBudget] = useState(6230000000);
  
  // Nhãn tuỳ biến (để đồng bộ tự động)
  const [labelBudget, setLabelBudget] = useState('DỰ KIẾN (VNĐ)');
  const [labelUsed, setLabelUsed] = useState('ĐÃ CHI (VNĐ)');
  const [labelRemain, setLabelRemain] = useState('CÒN LẠI (VNĐ)');

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
  
  // Versions State
  const [savedVersions, setSavedVersions] = useState<ReportVersion[]>([]);

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
      if (isResizingRef.current) {
        isResizingRef.current = false;
        // Bắn tín hiệu để kích hoạt đồng bộ độ rộng cột lên Firebase
        setTriggerSyncWidth(Date.now());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 0. Thu phóng (Auto-Scale)
  useEffect(() => {
    const calculateScale = () => {
      const scaleX = window.innerWidth / 1280;
      const scaleY = window.innerHeight / 720;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // 1. Nạp thư viện
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
        setLibsReady(true);
      }
    };

    initLibs();
  }, []);

  // 2. Xác thực Firebase
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

  // 3. Lắng nghe Firestore & TỰ ĐỘNG CHỐT PHIÊN BẢN THEO TUẦN (Auto-Archive)
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'budget', 'dashboard');
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // AUTO ARCHIVE
        const weekInfo = getVNWeekInfo();
        if (!data.currentWeekId) {
          setDoc(docRef, { currentWeekId: weekInfo.id, currentWeekName: weekInfo.name }, { merge: true });
        } else if (data.currentWeekId !== weekInfo.id && data.currentWeekId < weekInfo.id) {
          const archivedVersion: ReportVersion = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            name: data.currentWeekName || `Báo cáo tuần trước`,
            payload: {
              headerTitle: data.headerTitle || '',
              projectInfo: data.projectInfo || '',
              reportDate: data.reportDate || '',
              chartMainTitle: data.chartMainTitle || '',
              chartSubTitle: data.chartSubTitle || '',
              masterBudget: data.masterBudget || 0,
              chartData: data.chartData || [],
              activities: data.activities || [],
              activityFontSize: data.activityFontSize || 1,
              labelBudget: data.labelBudget || 'DỰ KIẾN (VNĐ)',
              labelUsed: data.labelUsed || 'ĐÃ CHI (VNĐ)',
              labelRemain: data.labelRemain || 'CÒN LẠI (VNĐ)',
              leftColWidth: data.leftColWidth || 58
            }
          };
          const updatedVersions = [archivedVersion, ...(data.savedVersions || [])];
          
          setDoc(docRef, { 
            savedVersions: updatedVersions,
            currentWeekId: weekInfo.id,
            currentWeekName: weekInfo.name
          }, { merge: true });
        }

        // TẢI DỮ LIỆU BÁO CÁO MỚI NHẤT RA GIAO DIỆN
        if (data.headerTitle) setHeaderTitle(data.headerTitle);
        if (data.projectInfo) setProjectInfo(data.projectInfo);
        if (data.reportDate) setReportDate(data.reportDate);
        if (data.chartMainTitle) setChartMainTitle(data.chartMainTitle);
        if (data.chartSubTitle) setChartSubTitle(data.chartSubTitle);
        if (data.masterBudget !== undefined) setMasterBudget(data.masterBudget);
        if (data.chartData) setChartData(data.chartData);
        if (data.activities) setActivities(data.activities);
        if (data.activityFontSize) setActivityFontSize(data.activityFontSize);
        if (data.savedVersions) setSavedVersions(data.savedVersions);
        if (data.labelBudget) setLabelBudget(data.labelBudget);
        if (data.labelUsed) setLabelUsed(data.labelUsed);
        if (data.labelRemain) setLabelRemain(data.labelRemain);
        if (data.leftColWidth) setLeftColWidth(data.leftColWidth);
      } else {
        const weekInfo = getVNWeekInfo();
        setDoc(docRef, { currentWeekId: weekInfo.id, currentWeekName: weekInfo.name }, { merge: true });
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
    if (v >= 1000000000) {
      const val = v / 1000000000;
      return val.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
    }
    if (v >= 1000000 && v % 1000000 === 0) {
      return (v / 1000000).toLocaleString('vi-VN') + ' tr';
    }
    return formatNumber(v);
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
            padding: { left: 10, right: 60, top: 10, bottom: 10 } 
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
              font: { family: 'Be Vietnam Pro', weight: 'normal', size: 9 },
              formatter: (v: number) => smartFormat(v),
              clip: false
            }
          },
          scales: {
            x: { 
              beginAtZero: true, 
              grid: { color: '#f1f5f9', drawBorder: false },
              ticks: { font: { family: 'Be Vietnam Pro', size: 9, weight: 'normal' }, callback: (v: any) => smartFormat(v) }
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

  // Đồng bộ Auto-Save Firestore chính
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
        labelBudget,
        labelUsed,
        labelRemain,
        leftColWidth,
        lastUpdated: new Date().toISOString(),
        ...updates
      }, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error);
    }
  };

  // Kích hoạt đồng bộ độ rộng cột khi resize xong
  useEffect(() => {
    if (triggerSyncWidth > 0) {
      syncToFirebase({ leftColWidth });
    }
  }, [triggerSyncWidth]);

  const usedSum = chartData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Tính năng Khôi phục/Tải phiên bản báo cáo cũ
  const handleLoadVersion = (version: ReportVersion) => {
    const p = version.payload;
    setHeaderTitle(p.headerTitle);
    setProjectInfo(p.projectInfo);
    setReportDate(p.reportDate);
    setChartMainTitle(p.chartMainTitle);
    setChartSubTitle(p.chartSubTitle);
    setMasterBudget(p.masterBudget);
    setChartData(p.chartData);
    setActivities(p.activities);
    setActivityFontSize(p.activityFontSize || 1);
    setLabelBudget(p.labelBudget || 'DỰ KIẾN (VNĐ)');
    setLabelUsed(p.labelUsed || 'ĐÃ CHI (VNĐ)');
    setLabelRemain(p.labelRemain || 'CÒN LẠI (VNĐ)');
    setLeftColWidth(p.leftColWidth || 58);
    
    // Ghi đè Auto-Save hiện tại
    syncToFirebase({
      headerTitle: p.headerTitle,
      projectInfo: p.projectInfo,
      reportDate: p.reportDate,
      chartMainTitle: p.chartMainTitle,
      chartSubTitle: p.chartSubTitle,
      masterBudget: p.masterBudget,
      chartData: p.chartData,
      activities: p.activities,
      activityFontSize: p.activityFontSize || 1,
      labelBudget: p.labelBudget || 'DỰ KIẾN (VNĐ)',
      labelUsed: p.labelUsed || 'ĐÃ CHI (VNĐ)',
      labelRemain: p.labelRemain || 'CÒN LẠI (VNĐ)',
      leftColWidth: p.leftColWidth || 58
    });
    
    setShowHistoryDrawer(false);
  };

  const handleDeleteVersion = (id: string) => {
    const updated = savedVersions.filter(v => v.id !== id);
    setSavedVersions(updated);
    syncToFirebase({ savedVersions: updated });
  };

  if ((loading && status === 'NGOẠI TUYẾN') || !libsReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] gap-4" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <svg className="animate-spin text-orange-500 w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-slate-400 text-[10px] font-medium tracking-[0.2em] uppercase">
          Đang tải
        </span>
      </div>
    );
  }

  return (
    <div 
      className="dashboard-root text-left"
      style={{
        backgroundColor: '#0f172a',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', 
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Menu Dropdown Gọn Gàng */}
      <div className="fixed top-6 right-6 z-50 print:hidden flex flex-col items-end">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="bg-slate-800 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition hover:bg-slate-700 flex items-center justify-center"
          title="Menu Công Cụ"
        >
          {isMenuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
        </button>

        {isMenuOpen && (
          <div className="flex flex-col gap-2 items-end mt-3 animate-fade-in-down">
            <button onClick={() => { window.print(); setIsMenuOpen(false); }} className="bg-orange-600 text-white px-5 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2 text-sm">
              <IconPrinter size={16} /> Xuất PDF
            </button>
            <button onClick={() => { setShowDrawer(true); setIsMenuOpen(false); }} className="bg-slate-700 text-white px-5 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2 text-sm">
              <IconEdit size={16} /> Sửa Dữ Liệu
            </button>
            <button onClick={() => { setShowHistoryDrawer(true); setIsMenuOpen(false); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2 text-sm">
              <IconHistory size={16} /> Lịch Sử Báo Cáo
            </button>
          </div>
        )}
      </div>

      <div className="print-wrapper-1" style={{ width: 1280 * scale, height: 720 * scale, position: 'relative' }}>
        <div className="print-wrapper-2" style={{
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
            className="slide-container shadow-2xl text-left"
            style={{
              width: '100%',
              height: '100%',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              textAlign: 'left'
            }}
          >
            <header className="flex items-center justify-between px-10 py-5 flex-none border-b border-slate-50 bg-slate-50/30 overflow-visible text-left">
              <div className="flex items-center gap-6 flex-none">
                <div className="bg-orange-600 text-white px-8 py-2.5 rounded-full shadow-lg shadow-orange-50">
                  <h1 contentEditable suppressContentEditableWarning onBlur={(e) => { setHeaderTitle(e.currentTarget.innerText || ''); syncToFirebase({headerTitle: e.currentTarget.innerText || ''}); }} className="text-xl font-black tracking-tighter uppercase editable leading-none">
                    {headerTitle}
                  </h1>
                </div>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => { setProjectInfo(e.currentTarget.innerText || ''); syncToFirebase({projectInfo: e.currentTarget.innerText || ''}); }} className="text-orange-600 font-bold text-[10px] tracking-[0.2em] editable uppercase leading-none">
                  {projectInfo}
                </p>
              </div>
              <div className="text-right flex-none">
                <div contentEditable suppressContentEditableWarning onBlur={(e) => { setReportDate(e.currentTarget.innerText || ''); syncToFirebase({reportDate: e.currentTarget.innerText || ''}); }} className="text-lg font-bold text-slate-700 editable leading-none">
                  {reportDate}
                </div>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden text-left" id="contentWrapper" ref={contentWrapperRef}>
              
              {/* Left Column */}
              <div className="flex flex-col p-8 min-h-0 overflow-visible border-r border-slate-100" style={{ flex: `0 0 ${leftColWidth}%` }}>
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

                <div className="flex-1 overflow-y-auto pr-4 custom-scroll text-left min-h-0" style={{ '--activity-font-scale': activityFontSize } as React.CSSProperties}>
                  {activities.map((act, idx) => (
                    <div key={idx} className="activity-block group text-left">
                      <div contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].num = e.currentTarget.innerText || ''; setActivities(n); syncToFirebase({activities: n}); }} className="activity-num editable text-left">
                        {act.num}
                      </div>
                      <div className="activity-content text-left">
                        <h3 contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].title = e.currentTarget.innerText || ''; setActivities(n); syncToFirebase({activities: n}); }} className="activity-title editable text-left">
                          {act.title}
                        </h3>
                        <p contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...activities]; n[idx].desc = e.currentTarget.innerText || ''; setActivities(n); syncToFirebase({activities: n}); }} className="activity-desc editable text-left">
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

              {/* TÍNH NĂNG RESIZER */}
              <div 
                className="resizer-v print:hidden"
                onMouseDown={(e) => {
                  e.preventDefault();
                  isResizingRef.current = true;
                }}
              ></div>

              {/* Right Column */}
              <div className="flex flex-col flex-1 pr-10 py-6 min-w-0 min-h-0 overflow-visible text-left">
                
                <div className="flex items-start justify-between mb-8 px-2 gap-4 shrink-0">
                  <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-visible text-left">
                    <h2 contentEditable suppressContentEditableWarning onBlur={(e) => { setChartMainTitle(e.currentTarget.innerText || ''); syncToFirebase({chartMainTitle: e.currentTarget.innerText || ''}); }} className="text-xl font-black text-slate-800 tracking-tighter uppercase editable leading-none text-left">
                      {chartMainTitle}
                    </h2>
                    <p contentEditable suppressContentEditableWarning onBlur={(e) => { setChartSubTitle(e.currentTarget.innerText || ''); syncToFirebase({chartSubTitle: e.currentTarget.innerText || ''}); }} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic editable leading-none text-left">
                      {chartSubTitle}
                    </p>
                  </div>
                  <div className="budget-card-slim shadow-sm flex-none text-left shrink-0">
                    <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest editable leading-none mb-1 text-left inline-block" contentEditable suppressContentEditableWarning onBlur={(e) => { setLabelBudget(e.currentTarget.innerText || ''); syncToFirebase({labelBudget: e.currentTarget.innerText || ''}); }}>{labelBudget}</h3>
                    <input className="number-input-main" value={formatNumber(masterBudget)} onChange={(e) => { const v = parseNumber(e.target.value); setMasterBudget(v); syncToFirebase({masterBudget: v}); }} />
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-3xl p-6 flex flex-col border border-slate-100 flex-1 min-h-0 overflow-visible relative shadow-sm">
                  <div className="flex-1 relative h-full min-h-0">
                    <canvas ref={chartCanvasRef}></canvas>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 px-2 overflow-visible shrink-0">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 min-w-0 overflow-visible text-left">
                    <p className="text-[7.5px] font-black text-slate-400 uppercase mb-2 editable leading-none text-left inline-block" contentEditable suppressContentEditableWarning onBlur={(e) => { setLabelUsed(e.currentTarget.innerText || ''); syncToFirebase({labelUsed: e.currentTarget.innerText || ''}); }}>{labelUsed}</p>
                    <p className="adaptive-value font-black text-slate-900 text-left">{formatNumber(usedSum)}</p>
                  </div>
                  <div className="bg-emerald-600 rounded-2xl p-5 shadow-xl shadow-emerald-100/50 text-white flex-1 min-w-0 overflow-visible text-left">
                    <p className="text-[7.5px] font-black text-emerald-100 uppercase mb-2 editable leading-none text-left inline-block" contentEditable suppressContentEditableWarning onBlur={(e) => { setLabelRemain(e.currentTarget.innerText || ''); syncToFirebase({labelRemain: e.currentTarget.innerText || ''}); }}>{labelRemain}</p>
                    <p className="adaptive-value font-black text-white text-left">{formatNumber(masterBudget - usedSum)}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Cập nhật dữ liệu */}
      {showDrawer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-6 bg-slate-900/40 backdrop-blur-sm print:hidden text-left">
          <div className="bg-white w-[600px] h-full rounded-3xl shadow-2xl p-8 flex flex-col animate-fade-in-right">
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
                        <input className="w-full font-bold text-slate-700 outline-none bg-slate-50 px-2 py-2 rounded-xl text-left focus:ring-2 focus:ring-orange-200 focus:bg-white transition" value={item.label} onChange={(e) => { const n = [...chartData]; n[idx].label = e.target.value; setChartData(n); syncToFirebase({chartData: n}); }} />
                      </td>
                      <td className="py-3 text-right">
                        <input className="text-right font-black text-orange-600 outline-none bg-slate-50 px-2 py-2 rounded-xl w-full focus:ring-2 focus:ring-orange-200 focus:bg-white transition" value={formatNumber(item.value)} onChange={(e) => { const n = [...chartData]; n[idx].value = parseNumber(e.target.value); setChartData(n); syncToFirebase({chartData: n}); }} />
                      </td>
                      <td className="py-3 text-right pl-2">
                        <input 
                          placeholder="+0" 
                          className="w-full text-right font-bold text-emerald-600 bg-emerald-50 px-2 py-2 rounded-xl outline-none border border-emerald-100 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition" 
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            e.target.value = raw ? '+' + formatNumber(parseInt(raw)) : '';
                          }}
                          onBlur={(e) => { 
                            const v = parseNumber(e.currentTarget.value); 
                            if(v>0){ 
                              const n=[...chartData]; 
                              n[idx].value+=v; 
                              setChartData(n); 
                              syncToFirebase({chartData:n}); 
                              e.currentTarget.value=''; 
                            } 
                          }} 
                        />
                      </td>
                      <td className="text-right pl-2">
                        <button onClick={() => { const n = chartData.filter((_, i) => i !== idx); setChartData(n); syncToFirebase({chartData: n}); }} className="text-slate-300 hover:text-red-500 bg-slate-50 p-2 rounded-xl hover:bg-red-50 transition"><IconX size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => { const n = [...chartData, { label: 'Mục mới', value: 0 }]; setChartData(n); syncToFirebase({chartData: n}); }} className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition uppercase">+ THÊM DÒNG MỚI</button>
            </div>
            <button onClick={() => setShowDrawer(false)} className="mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-600 transition shadow-lg">HOÀN TẤT</button>
          </div>
        </div>
      )}

      {/* MODAL 2: Drawer Lịch Sử Báo Cáo */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-6 bg-slate-900/40 backdrop-blur-sm print:hidden text-left">
          <div className="bg-white w-[450px] h-full rounded-3xl shadow-2xl p-8 flex flex-col animate-fade-in-right">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <h3 className="font-black text-slate-800 uppercase tracking-widest">Lịch sử báo cáo</h3>
              <button onClick={() => setShowHistoryDrawer(false)} className="text-slate-400 hover:text-slate-900"><IconX size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scroll text-left">
              {savedVersions.length === 0 ? (
                <div className="text-center mt-12">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconHistory size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Chưa có phiên bản nào được lưu.</p>
                  <p className="text-slate-400 text-xs mt-2">Hệ thống sẽ tự động lưu báo cáo khi bắt đầu một tuần mới (vào Thứ Hai).</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {savedVersions.map(v => (
                    <div key={v.id} className="bg-white border-2 border-slate-100 rounded-2xl p-5 flex flex-col gap-4 group hover:border-orange-200 hover:shadow-lg transition relative overflow-hidden">
                      <div className="flex justify-between items-start z-10">
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{v.name}</h4>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-1">{new Date(v.timestamp).toLocaleString('vi-VN')}</p>
                        </div>
                        <button onClick={() => handleDeleteVersion(v.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2 bg-slate-50 hover:bg-red-50 rounded-lg">
                          <IconTrash size={16} />
                        </button>
                      </div>
                      <button onClick={() => handleLoadVersion(v)} className="w-full py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:text-white hover:bg-orange-600 hover:border-orange-600 transition z-10">
                        SỬ DỤNG PHIÊN BẢN NÀY LÀM MẪU
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
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
            user-select: text !important; 
            white-space: pre-wrap; 
            word-break: break-word;
            line-height: 1.2;
            text-align: left;
            outline: none;
            padding: 2px 4px;
            margin: 0 -4px;
            border-radius: 4px;
            min-width: 20px;
            transition: all 0.2s;
        }
        .editable:hover {
            background-color: rgba(234, 88, 12, 0.05);
            cursor: text;
        }
        .editable:focus {
            background-color: #fff7ed;
            box-shadow: 0 0 0 1px #fdba74;
        }

        .activity-block {
            margin-bottom: 0.25rem;
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 4px 0;
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
            display: block;
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
            margin-bottom: 2px !important;
            line-height: 1.2;
            text-align: left;
            display: block;
        }

        .activity-desc {
            font-size: calc(0.85rem * var(--activity-font-scale, 1)); 
            color: #475569;
            line-height: 1.3;
            text-align: left;
            display: block;
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
        
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
        
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right { animation: fadeInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* CẤU HÌNH CSS ĐỂ XUẤT PDF HOÀN HẢO */
        @media print {
            @page {
                size: 1280px 720px;
                margin: 0;
            }
            body, html {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                width: 1280px !important;
                height: 720px !important;
                overflow: hidden !important;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .dashboard-root { 
                position: absolute !important; 
                top: 0 !important; 
                left: 0 !important; 
                right: auto !important;
                bottom: auto !important;
                background: white !important; 
                display: block !important; 
                width: 1280px !important;
                height: 720px !important;
                overflow: hidden !important;
            }
            .print-wrapper-1, .print-wrapper-2 {
                width: 1280px !important;
                height: 720px !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                transform: scale(1) !important;
            }
            .slide-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 1280px !important;
                height: 720px !important;
                margin: 0 !important;
            }
            .resizer-v { display: none !important; }
        }
      `}} />
    </div>
  );
}