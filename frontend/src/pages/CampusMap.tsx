import React, { useState, useMemo } from 'react';
import { 
  FiMaximize2, 
  FiMinimize2,
  FiSearch, 
  FiNavigation, 
  FiLayers, 
  FiAlertCircle,
  FiActivity,
  FiCornerDownRight,
  FiTarget,
  FiList
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const CampusMap: React.FC = () => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const [imageError, setImageError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const navigationPoints = [
    { id: 1, name: 'Fuaye', building: 'Main Entry (A Blok)', type: 'Common', x: 35, y: 82 },
    { id: 2, name: 'C Blok Koridor', building: 'C Blok', type: 'Passage', x: 38, y: 40 },
    { id: 3, name: 'Yemekhane', building: 'H Blok', type: 'Dining', x: 42, y: 27 },
    { id: 4, name: 'Kütüphane', building: 'S Blok', type: 'Library', x: 55, y: 68 },
    { id: 5, name: 'Öğrenci İşleri', building: 'Y Blok', type: 'Admin', x: 71, y: 77 },
    { id: 6, name: 'Kariyer Merkezi', building: 'Y Blok', type: 'Admin', x: 74, y: 79 },
    { id: 7, name: 'Y Blok Zemin Kat', building: 'Y Blok', type: 'Education', x: 85, y: 78 },
    { id: 8, name: 'Y Blok 1. Kat', building: 'Y Blok', type: 'Education', x: 87, y: 80 },
    { id: 9, name: 'Katrensü Diller', building: 'Y Blok Area', type: 'Education', x: 87, y: 65 },
    { id: 10, name: 'T Blok Fuaye', building: 'T Blok', type: 'Common', x: 12, y: 78 },
    { id: 11, name: 'T Blok Yemekhane', building: 'T Blok', type: 'Dining', x: 11, y: 71 },
    { id: 12, name: 'Öğrenci Yurdu', building: 'Sanayi Site', type: 'Residence', x: 83, y: 3 },
    { id: 13, name: 'SKS Girişi', building: 'S Blok', type: 'Health', x: 60, y: 77 },
    { id: 14, name: 'SKS Fitness Salonu', building: 'S Blok', type: 'Sports', x: 66, y: 73 },
    { id: 15, name: 'SKS Revir', building: 'S Blok', type: 'Health', x: 65, y: 77 },
    { id: 16, name: 'M Blok', building: 'M Blok', type: 'Education', x: 57, y: 53 },
  ];

  const filteredPoints = useMemo(() => {
    return navigationPoints.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.building.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, navigationPoints]);

  const buildings = [
    { id: 'T', name: 'T Blok', points: [10, 11] },
    { id: 'M', name: 'M Blok', points: [16] },
    { id: 'S', name: 'S Blok', points: [4, 13, 14, 15] },
    { id: 'Y', name: 'Y Blok', points: [5, 6, 7, 8, 9] },
    { id: 'C', name: 'Main Blocks', points: [1, 2, 3] },
  ];

  const MapContent = () => (
    <>
      {/* Visual Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-30">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(var(--uv-primary) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-20 flex flex-col gap-2">
          <div className="bg-uv-black/80 backdrop-blur-md px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl border border-white/10 text-white flex items-center gap-2 lg:gap-3 shadow-lg">
              <FiLayers className="text-primary" />
              <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest leading-none">Tactical Layout</span>
          </div>
      </div>

      <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-20 flex gap-2">
          <button 
             onClick={() => setIsMaximized(!isMaximized)}
             className="w-10 h-10 lg:w-12 lg:h-12 bg-uv-black/80 backdrop-blur-md border border-white/10 text-white flex items-center justify-center rounded-xl lg:rounded-2xl hover:bg-primary hover:border-primary transition-all"
          >
              {isMaximized ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
          </button>
      </div>

      {/* Map Imagery */}
      <div className="h-full w-full flex items-center justify-center p-4 lg:p-8 bg-[#0d0d0f] overflow-auto relative scrollbar-hide">
         {!imageError ? (
            <div className="relative inline-block h-[90%] lg:h-[95%]">
                <img 
                    src="/campus_map.png" 
                    alt="Yaşar Campus Infrastructure" 
                    className="h-full w-auto max-w-none rounded-2xl shadow-[0_0_100px_rgba(79,70,229,0.15)] transition-all duration-1000"
                    onError={() => setImageError(true)}
                />
                
                {/* Interactive Navigation Mesh */}
                {navigationPoints.map(point => (
                    <div 
                        key={point.id}
                        className="absolute group cursor-pointer transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 hover:z-30" 
                        style={{ left: `${point.x}%`, top: `${point.y}%`, zIndex: selectedPoint === point.id ? 40 : 20 }}
                        onClick={() => setSelectedPoint(point.id)}
                    >
                        {selectedPoint === point.id && (
                            <div className="absolute inset-[-4px] bg-primary rounded-full animate-ping opacity-60 pointer-events-none" />
                        )}
                        <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[8px] lg:text-[9px] font-black transition-all ${selectedPoint === point.id ? 'bg-primary text-white scale-125' : 'bg-uv-black/90 text-white hover:bg-primary'}`}>
                            {point.id}
                        </div>
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#111827]/95 backdrop-blur-md border border-white/10 text-white px-2 py-1 lg:px-3 lg:py-1.5 flex flex-col items-center rounded-lg transition-all whitespace-nowrap pointer-events-none shadow-xl ${selectedPoint === point.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                            <span className="text-[10px] lg:text-xs font-black block leading-tight">{point.name}</span>
                            <span className="text-[8px] lg:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{point.building}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-[#111827]/95 border-r-[6px] border-r-transparent" />
                        </div>
                    </div>
                ))}
            </div>
         ) : (
            <div className="flex flex-col items-center gap-6 text-center text-white p-12">
                <FiAlertCircle size={48} className="text-primary animate-pulse" />
                <div>
                    <h4 className="text-2xl font-black mb-2">TELEMETRY_OFFLINE</h4>
                    <p className="text-uv-gray text-xs font-bold max-w-xs leading-relaxed capitalize">
                       Please ensure 'campus_map.png' is located in your public directory.
                    </p>
                </div>
            </div>
         )}
      </div>
    </>
  );

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden transition-colors duration-500 ${isSpace ? 'bg-[#050510]' : 'bg-white'} selection:bg-primary selection:text-white`}>
      {/* OS Header */}
      <div className={`flex-shrink-0 sticky top-0 backdrop-blur-xl border-b z-30 px-6 py-5 flex items-center justify-between ${isSpace ? 'bg-[#0a0a1a]/80 border-white/5' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-uv-black'}`}>
             <FiNavigation size={24} className="text-primary animate-pulse" />
           </div>
           <div>
              <h2 className="text-2xl font-black tracking-tighter leading-none">
                <span className={isSpace ? 'text-white' : 'text-uv-black'}>GEOMAP</span>
                <span className="text-primary italic">.NAV</span>
              </h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isSpace ? 'text-[#e1e1e6]/40' : 'text-uv-gray'}`}>Yaşar Campus Infrastructure</p>
           </div>
        </div>
        
        <div className={`flex items-center gap-3 border p-1.5 rounded-2xl w-full max-w-sm hidden md:flex ${isSpace ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-uv-border'}`}>
            <FiSearch className="ml-3 text-uv-gray" />
            <input 
                type="text" 
                placeholder="Search waypoint (e.g. library, gym)..." 
                className={`bg-transparent border-none outline-none text-xs font-bold w-full py-2 placeholder:text-uv-gray/40 ${isSpace ? 'text-white' : 'text-uv-black'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-uv-black text-white text-[10px] px-3 py-1.5 rounded-xl font-black"
                >
                  CLEAR
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 min-h-0 overflow-hidden relative">
        {/* Left Side: Interactive Map & Target Details */}
        <div className={`flex-[3] flex flex-col p-4 lg:p-6 border-b xl:border-b-0 xl:border-r ${isSpace ? 'border-white/5' : 'border-gray-50'} min-w-0 h-full`}>
          <div className="relative flex-1 uv-card !rounded-[2rem] lg:rounded-[3rem] overflow-hidden bg-uv-black shadow-2xl min-h-[300px] border-none group">
            <MapContent />
          </div>
          
          <AnimatePresence>
            {selectedPoint && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                  <div className={`uv-card !p-4 lg:!p-6 relative overflow-hidden shrink-0 flex items-center justify-between gap-6 ${isSpace ? 'bg-primary/10 text-white' : 'bg-[#111827] text-white'}`}>
                    <div className="absolute top-0 right-0 p-2 lg:p-4 opacity-10">
                        <FiActivity size={48} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10 w-full lg:w-auto">
                        <div className="w-10 h-10 lg:w-14 lg:h-14 bg-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                            <FiTarget size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] lg:text-xs font-black text-primary uppercase tracking-widest leading-none mb-1">Target Waypoint Locked</p>
                            <h5 className="text-lg lg:text-2xl font-black truncate">{navigationPoints.find(p => p.id === selectedPoint)?.name}</h5>
                        </div>
                    </div>
                    <button className="hidden lg:flex shrink-0 bg-primary text-white text-xs lg:text-sm font-black py-3 lg:py-4 px-6 lg:px-8 rounded-xl items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95">
                        START GUIDED PATH <FiChevronRight size={20} />
                    </button>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Waypoint Index */}
        <div className={`w-full xl:w-[320px] flex-shrink-0 p-4 lg:p-6 flex flex-col border-t xl:border-t-0 h-full min-h-0 ${isSpace ? 'bg-[#0a0a1a]/20 border-white/5' : 'bg-gray-50/30 border-gray-50'}`}>
          <div className="flex items-center justify-between mb-4 lg:mb-6">
             <h3 className={`font-black text-lg lg:text-xl flex items-center gap-2 tracking-tighter truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>
               <FiList className="text-primary shrink-0" /> INDEX
             </h3>
             <span className="bg-primary/10 text-primary text-[9px] font-black px-2 lg:px-3 py-1 rounded-full uppercase tracking-widest shrink-0">
                {filteredPoints.length} PTS
             </span>
          </div>

          <div className="space-y-2 lg:space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-hide max-h-[500px] xl:max-h-none">
            {filteredPoints.map((point) => (
              <motion.div 
                key={point.id}
                layout
                onClick={() => setSelectedPoint(point.id)}
                className={`uv-card !p-3 lg:!p-4 cursor-pointer transition-all border-l-2 lg:border-l-4 ${
                  selectedPoint === point.id 
                    ? (isSpace ? 'bg-primary/10 border-l-primary shadow-xl' : 'bg-white border-l-primary shadow-xl') 
                    : (isSpace ? 'bg-white/5 border-l-transparent hover:bg-white/10' : 'bg-white/40 border-l-transparent hover:bg-white')
                }`}
              >
                <div className="flex justify-between items-start mb-1 lg:mb-2">
                    <span className={`w-5 h-5 lg:w-6 lg:h-6 rounded-lg flex items-center justify-center text-[9px] lg:text-[10px] font-black ${isSpace ? 'bg-primary/20 text-primary' : 'bg-[#111827] text-white'}`}>
                        {point.id}
                    </span>
                    <span className={`text-[7px] lg:text-[8px] font-black uppercase tracking-[0.1em] lg:tracking-[0.2em] text-gray-500`}>{point.type}</span>
                </div>
                <h4 className={`font-black text-xs lg:text-sm truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{point.name}</h4>
                <div className="flex items-center gap-1.5 mt-1.5 text-uv-gray">
                    <FiCornerDownRight size={10} className="text-primary" />
                    <span className="text-[8px] lg:text-[10px] font-bold uppercase truncate">{point.building}</span>
                </div>
              </motion.div>
            ))}

            {filteredPoints.length === 0 && (
                <div className="p-12 text-center text-uv-gray italic text-xs">
                    No results.
                </div>
            )}
          </div>
        </div>

        {/* Fullscreen Overlay */}
        <AnimatePresence>
            {isMaximized && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className={`fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 ${isSpace ? 'bg-[#050510]/95 backdrop-blur-2xl' : 'bg-black/90 backdrop-blur-2xl'}`}
                >
                   <div className="w-full h-full relative uv-card !rounded-[3rem] overflow-hidden bg-uv-black shadow-[0_0_100px_rgba(0,0,0,0.5)] border-none">
                       <MapContent />
                   </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* OS Footer */}
      <div className={`flex-shrink-0 p-6 border-t flex flex-wrap justify-between items-center gap-6 mt-auto ${isSpace ? 'border-white/5 bg-[#0a0a1a]/80' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-6">
            {buildings.map(b => (
                <div key={b.id} className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-uv-gray mb-1">{b.name}</span>
                    <div className="flex gap-1">
                        {b.points.slice(0, 3).map(p => (
                            <div key={p} className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${isSpace ? 'bg-white/5 text-uv-gray' : 'bg-gray-100 text-uv-gray'}`}>{p}</div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        <div className="text-[10px] font-black text-uv-gray uppercase tracking-widest flex items-center gap-2">
            Status: Mesh Initialized <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
        </div>
      </div>
    </div>
  );
};

const FiChevronRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default CampusMap;
