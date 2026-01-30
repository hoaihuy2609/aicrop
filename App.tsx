
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, ExtractionResult, DetectedItem } from './types';
import { detectObjects } from './services/geminiService';
import { cropImage, createZipArchive } from './utils/imageProcessing';
import { convertPdfToImages } from './utils/pdfProcessing';
import { 
  Upload, 
  Scissors, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ImageIcon,
  Search,
  FileArchive,
  FileText,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Maximize
} from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [imagePages, setImagePages] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>("Cắt toàn bộ các câu hỏi trong đề bài này");
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsAppFullscreen(isCurrentlyFullscreen && !previewIdx);
      setIsPreviewFullscreen(isCurrentlyFullscreen && previewIdx !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [previewIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          setPreviewIdx(null);
        }
      }
      if (e.key === 'ArrowLeft' && previewIdx !== null) handlePrevPreview();
      if (e.key === 'ArrowRight' && previewIdx !== null) handleNextPreview();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIdx]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus(AppStatus.UPLOADING);
    setError(null);
    setResults([]);

    try {
      if (file.type === 'application/pdf') {
        const fileUrl = URL.createObjectURL(file);
        const images = await convertPdfToImages(fileUrl);
        setImagePages(images);
        setSelectedPageIndex(0);
        URL.revokeObjectURL(fileUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePages([event.target?.result as string]);
          setSelectedPageIndex(0);
        };
        reader.readAsDataURL(file);
      }
      setStatus(AppStatus.IDLE);
    } catch (err: any) {
      setError("Không thể đọc file PDF. Vui lòng thử lại.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleProcess = async () => {
    if (imagePages.length === 0 || !prompt) return;

    try {
      setStatus(AppStatus.PROCESSING);
      setProgress(5);
      setError(null);
      const allResults: ExtractionResult[] = [];

      for (let i = 0; i < imagePages.length; i++) {
        const currentPageSrc = imagePages[i];
        const pageProgressBase = (i / imagePages.length) * 100;
        const pageProgressStep = 100 / imagePages.length;

        setProgress(Math.round(pageProgressBase + (pageProgressStep * 0.2)));

        const detections: DetectedItem[] = await detectObjects(currentPageSrc, prompt);
        
        setProgress(Math.round(pageProgressBase + (pageProgressStep * 0.6)));

        if (detections.length > 0) {
          const img = new Image();
          img.src = currentPageSrc;
          await new Promise((resolve) => (img.onload = resolve));

          for (const detection of detections) {
            const label = imagePages.length > 1 ? `Trang ${i + 1} - ${detection.label}` : detection.label;
            const cropped = await cropImage(img, detection.box_2d, label);
            allResults.push(cropped);
          }
        }
        
        setProgress(Math.round(pageProgressBase + pageProgressStep));
      }

      if (allResults.length === 0) {
        throw new Error("Không tìm thấy phần nào để cắt dựa trên yêu cầu của bạn.");
      }

      setResults(allResults);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi trong quá trình xử lý.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    const zipBlob = await createZipArchive(results);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = fileName ? fileName.split('.')[0] : 'extracted';
    a.download = `${cleanName}_extracted_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrevPreview = () => {
    if (previewIdx === null) return;
    setPreviewIdx(previewIdx === 0 ? results.length - 1 : previewIdx - 1);
  };

  const handleNextPreview = () => {
    if (previewIdx === null) return;
    setPreviewIdx(previewIdx === results.length - 1 ? 0 : previewIdx + 1);
  };

  const toggleAppFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error enabling app fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const togglePreviewFullscreen = () => {
    if (!previewContainerRef.current) return;
    if (!document.fullscreenElement) {
      previewContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling preview fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const reset = () => {
    setImagePages([]);
    setResults([]);
    setStatus(AppStatus.IDLE);
    setFileName(null);
    setPreviewIdx(null);
    setPrompt("Cắt toàn bộ các câu hỏi trong đề bài này");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SmartCrop <span className="text-indigo-600">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAppFullscreen}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
              title={isAppFullscreen ? "Thoát toàn màn hình" : "Mở toàn màn hình"}
            >
              {isAppFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button 
              onClick={reset}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm">1</span>
              Tải file (Ảnh/PDF) và nhập yêu cầu
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    imagePages.length > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {status === AppStatus.UPLOADING ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                      <p className="text-sm text-slate-500">Đang chuẩn bị file...</p>
                    </div>
                  ) : imagePages.length > 0 ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img src={imagePages[selectedPageIndex]} className="w-full h-full object-contain rounded-lg shadow-sm" alt="Preview" />
                      {imagePages.length > 1 && (
                        <div className="absolute bottom-6 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Trang {selectedPageIndex + 1} / {imagePages.length}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Nhấn để tải lên</p>
                      <p className="text-xs text-slate-400 mt-1">Ảnh hoặc PDF đề bài</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                  />
                </div>
                
                {imagePages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {imagePages.map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPageIndex(idx)}
                        className={`flex-shrink-0 w-12 h-16 rounded border-2 transition-all overflow-hidden ${
                          selectedPageIndex === idx ? 'border-indigo-500 scale-105 shadow-md' : 'border-slate-200 opacity-60'
                        }`}
                      >
                        <img src={page} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    AI cần cắt gì từ file này?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="VD: Cắt toàn bộ các câu hỏi trong đề này..."
                    className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 resize-none"
                  />
                </div>
                
                <button
                  onClick={handleProcess}
                  disabled={imagePages.length === 0 || !prompt || status === AppStatus.PROCESSING}
                  className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                    imagePages.length === 0 || !prompt || status === AppStatus.PROCESSING
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
                  }`}
                >
                  {status === AppStatus.PROCESSING ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Đang xử lý {progress}%...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      Cắt toàn bộ {imagePages.length > 1 ? `${imagePages.length} trang` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {status === AppStatus.PROCESSING && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-400 p-2 rounded-full">
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              </div>
              <p className="text-sm text-blue-700 font-medium">
                Gemini đang trích xuất dữ liệu. Vui lòng đợi trong giây lát...
              </p>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <section className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-7 h-7 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm">2</span>
                Kết quả trích xuất ({results.length})
              </h2>
              <button
                onClick={handleDownloadZip}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Tải ZIP
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((res, idx) => (
                <div 
                  key={res.id} 
                  onClick={() => setPreviewIdx(idx)}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm group hover:border-indigo-400 hover:shadow-md transition-all cursor-zoom-in active:scale-[0.98]"
                >
                  <div className="relative aspect-auto max-h-[300px] overflow-hidden rounded-lg bg-slate-100">
                    <img src={res.dataUrl} className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]" alt={res.label} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-all">
                      <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[80%]" title={res.label}>{res.label}</span>
                    <span className="text-[10px] text-indigo-400 font-medium">#{(idx + 1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {status === AppStatus.IDLE && imagePages.length === 0 && (
          <div className="mt-12 text-center max-w-md mx-auto">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-slate-800 font-semibold mb-2">Hỗ trợ cả PDF và Hình ảnh</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Tải lên file PDF hoặc ảnh chụp đề bài. AI sẽ tự động phân tích tất cả các trang và cắt từng câu hỏi cho bạn.
            </p>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {previewIdx !== null && (
        <div 
          ref={previewContainerRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-hidden"
        >
          {/* Controls Overlay */}
          <div className="absolute top-6 right-6 flex items-center gap-4 z-[60]">
            <button 
              onClick={togglePreviewFullscreen}
              className="text-white/70 hover:text-white transition-colors p-2 bg-white/10 hover:bg-white/20 rounded-lg"
              title={isPreviewFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isPreviewFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => setPreviewIdx(null)}
              className="text-white/70 hover:text-white transition-colors p-2 bg-white/10 hover:bg-white/20 rounded-lg"
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <button 
            onClick={handlePrevPreview}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all backdrop-blur-md"
            title="Ảnh trước (Mũi tên trái)"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="relative group max-w-full max-h-full flex items-center justify-center">
              <img 
                src={results[previewIdx].dataUrl} 
                className={`max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 ${isPreviewFullscreen ? 'h-screen w-screen max-h-screen object-contain' : ''}`} 
                alt="Preview Full" 
              />
            </div>
            
            {!isPreviewFullscreen && (
              <div className="mt-6 text-center animate-in slide-in-from-bottom-2 duration-300">
                <p className="text-white font-medium text-lg tracking-wide">{results[previewIdx].label}</p>
                <p className="text-white/50 text-sm mt-1">Ảnh {previewIdx + 1} / {results.length}</p>
                <button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = results[previewIdx].dataUrl;
                    a.download = `${results[previewIdx].label}.jpg`;
                    a.click();
                  }}
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống ảnh này
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={handleNextPreview}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[60] bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all backdrop-blur-md"
            title="Ảnh tiếp theo (Mũi tên phải)"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 py-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 sm:gap-10">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>Gemini 3 Flash Vision</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileArchive className="w-3.5 h-3.5 text-orange-500" />
            <span>Nén ZIP tự động</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Hỗ trợ PDF đa trang</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
