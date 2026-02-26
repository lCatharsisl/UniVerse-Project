import React, { useState, useEffect } from 'react';
import { FiSearch, FiClock, FiBook, FiCoffee, FiInfo, FiArrowRight, FiCalendar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const RightSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [recentItem, setRecentItem] = useState<any>(null);

  useEffect(() => {
    fetchRecentItem();
  }, []);

  const fetchRecentItem = async () => {
    try {
      const res = await api.get('/services/lost-items', { params: { limit: 1 } });
      if (res.data.items && res.data.items.length > 0) {
        setRecentItem(res.data.items[0]);
      }
    } catch (err) {
      console.error('Failed to fetch recent item');
    }
  };

  return (
    <div className="hidden lg:flex flex-col gap-6 p-6 sticky top-0 h-screen overflow-y-auto w-[380px]">
      {/* Search Bar - Marginal Style */}
      <div className="sticky top-0 bg-white pt-1 pb-3 z-10">
        <div className="flex items-center gap-3 bg-uv-border/50 border border-transparent focus-within:bg-white focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 px-5 py-3 rounded-tl-2xl rounded-br-2xl transition-all">
          <FiSearch className="text-uv-gray" />
          <input 
            type="text" 
            placeholder="Search Hub..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
          />
        </div>
      </div>

      {/* Campus Pulse Grid */}
      <div className="space-y-4">
        <h3 className="px-1 font-black text-2xl tracking-tighter text-uv-black flex items-center gap-2">
            Campus Pulse <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
            {/* Free Rooms Widget */}
            <div 
                onClick={() => navigate('/explore')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group"
            >
                <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiClock size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">Status</p>
                <p className="text-sm font-bold text-uv-black">Free Rooms</p>
            </div>

            {/* Academic Calendar Widget */}
            <div 
                onClick={() => navigate('/academic-calendar')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group"
            >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiCalendar size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">Academic</p>
                <p className="text-sm font-bold text-uv-black">Academic Calendar</p>
            </div>

            {/* Library Widget */}
            <div className="uv-card p-4 hover:border-primary/30 uv-card-hover group">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiBook size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">Resources</p>
                <p className="text-sm font-bold text-uv-black">Library Hub</p>
            </div>
        </div>

        {/* Food Widget */}
        <div 
            onClick={() => navigate('/food-menu')}
            className="uv-card p-5 border-l-4 border-l-accent bg-accent/5 hover:border-primary/30 uv-card-hover cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="w-10 h-10 bg-white text-accent rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FiCoffee size={20} />
                </div>
                <span className="bg-white/50 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black uppercase text-accent border border-accent/10">Today's Menu</span>
            </div>
            <p className="font-bold text-uv-black text-sm">Creamy Mushroom Pasta & Seasoned Salad</p>
            <p className="text-uv-gray text-xs mt-1 font-medium">Available until 14:30 at Cafeteria A</p>
        </div>

        {/* Bulletin Widget */}
        <div className="uv-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <FiInfo size={64} />
            </div>
            <h4 className="text-xs font-black uppercase text-uv-gray tracking-widest mb-3">Community Bulletin</h4>
            {recentItem ? (
                <div className="space-y-2">
                    <p className="text-sm font-bold text-uv-black leading-tight">New report: {recentItem.lost_item_name}</p>
                    <p className="text-xs text-uv-gray font-medium flex items-center gap-1">
                        <FiInfo /> Lost near {recentItem.location}
                    </p>
                    <button 
                        onClick={() => navigate(`/item/lost/${recentItem.lost_item_id}`)}
                        className="mt-2 flex items-center gap-2 text-primary font-black text-xs hover:gap-3 transition-all"
                    >
                        VIEW DETAILS <FiArrowRight />
                    </button>
                </div>
            ) : (
                <p className="text-sm font-bold text-uv-black">No urgent announcements</p>
            )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-8 px-2 border-t border-uv-border">
        <div className="flex items-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
            <div className="w-6 h-6 bg-uv-black rounded-lg flex items-center justify-center text-white font-black text-[10px]">U</div>
            <span className="font-black tracking-tighter text-sm uppercase">UniVerse Ecosystem</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-uv-gray text-[10px] font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-primary">Legal</a>
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Credits</a>
            <span>© 2026</span>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
