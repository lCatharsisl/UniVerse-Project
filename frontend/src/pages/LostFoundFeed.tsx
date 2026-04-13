import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { Link } from 'react-router-dom';
import { FiPlus, FiMapPin, FiClock, FiSearch, FiPackage, FiArrowLeft } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { LostFoundItemImage } from '../components/lostFound/LostFoundItemImage';
import type { LostFoundVisualKind } from '../components/lostFound/LostFoundPlaceholder';

interface Item {
    lost_item_id?: number;
    found_item_id?: number;
    lost_item_name?: string;
    found_item_name?: string;
    location: string;
    description: string;
    lost_date?: string;
    found_date?: string;
    is_resolved: boolean;
    resolved_at?: string;
    imageUrl?: string;
    __type?: 'lost' | 'found';
}

const LostFoundFeed = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState<Item[]>([]);
    const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'resolved'>('lost');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { dimension } = useTheme();
    const isSpace = dimension === 'space';

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            if (activeTab === 'resolved') {
                const [lostRes, foundRes] = await Promise.all([
                    api.get('/services/lost-items', { params: { isResolved: true, limit: 25 } }),
                    api.get('/services/found-items', { params: { isResolved: true, limit: 25 } })
                ]);
                const lostItems = (lostRes.data.items || []).map((i: any) => ({ ...i, __type: 'lost' }));
                const foundItems = (foundRes.data.items || []).map((i: any) => ({ ...i, __type: 'found' }));
                const combined = [...lostItems, ...foundItems].sort((a, b) => {
                    const dateA = new Date(a.resolved_at || a.lost_date || a.found_date || 0).getTime();
                    const dateB = new Date(b.resolved_at || b.lost_date || b.found_date || 0).getTime();
                    return dateB - dateA;
                });
                setItems(combined);
            } else {
                const endpoint = activeTab === 'lost' ? '/services/lost-items' : '/services/found-items';
                const res = await api.get(endpoint, { params: { isResolved: false, limit: 50 } });
                const typedItems = (res.data.items || []).map((i: any) => ({ ...i, __type: activeTab }));
                setItems(typedItems);
            }
        } catch (err) {
            console.error('Failed to fetch items', err);
        } finally {
            setLoading(false);
        }
    };

    const getItemName = (item: Item) => item.lost_item_name || item.found_item_name;
    const getItemId = (item: Item) => item.lost_item_id || item.found_item_id;
    const getItemDate = (item: Item) => item.lost_date || item.found_date;

    const filteredItems = items.filter(item =>
        getItemName(item)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabPlaceholderKind: LostFoundVisualKind =
        activeTab === 'lost' ? 'lost' : activeTab === 'found' ? 'found' : 'resolved';

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <div className={`sticky top-0 premium-blur border-b z-10 px-3 py-2 md:px-4 md:py-3 ${isSpace ? 'border-white/10' : 'border-x-border'}`}>
                <div className="flex items-center justify-between gap-3 md:gap-6">
                    <h2 className={`text-sm md:text-xl font-black truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('lostFound.title')}</h2>
                    <div className="flex-1 max-w-[140px] md:max-w-xs relative shrink-0">
                        <FiSearch className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isSpace ? 'text-white/30' : 'text-gray-400'}`} size={12} />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-8 pr-3 py-1 border-none rounded-full text-[10px] md:text-xs outline-none focus:ring-1 focus:ring-primary transition-all ${
                                isSpace ? 'bg-white/5 text-white placeholder:text-white/20' : 'bg-gray-100 text-uv-black'
                            }`}
                        />
                    </div>
                </div>
                
                <div className="flex mt-2 md:mt-3">
                    {['lost', 'found', 'resolved'].map((tab) => (
                         <div 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 text-center text-[10px] md:text-sm font-bold pb-1.5 md:pb-2 cursor-pointer transition-colors relative capitalize ${
                                activeTab === tab 
                                    ? (isSpace ? 'text-white font-black' : 'text-gray-900 font-black') 
                                    : (isSpace ? 'text-white/40 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')
                            }`}
                         >
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-primary rounded-full mx-6 md:mx-4" />}
                         </div>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col mb-20">
                {loading ? (
                    <div className={`p-10 text-center animate-pulse text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/20' : 'text-gray-400'}`}>Searching the lost items...</div>
                ) : filteredItems.length === 0 ? (
                    <div className={`p-20 text-center font-bold ${isSpace ? 'text-white/30' : 'text-gray-500'}`}>
                         <FiPackage size={40} className="mx-auto mb-4 opacity-20" />
                         <p className="text-xs uppercase tracking-widest">No items found here.</p>
                         <Link to="/create-item" className="text-primary hover:underline text-[10px] font-black mt-2 inline-block uppercase tracking-widest">Post an item</Link>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {filteredItems.map(item => (
                            <Link
                                key={`${item.__type || activeTab}-${getItemId(item)}`}
                                to={`/item/${item.__type || activeTab}/${getItemId(item)}`}
                                className={`p-3 md:p-4 border-b transition-colors flex gap-3 ${
                                    isSpace ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'
                                }`}
                            >
                                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center ${
                                    isSpace ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-100'
                                }`}>
                                    <LostFoundItemImage
                                        imageUrl={item.imageUrl}
                                        kind={tabPlaceholderKind}
                                        alt={getItemName(item) || ''}
                                    />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className={`font-black text-sm md:text-base truncate ${isSpace ? 'text-white' : 'text-gray-900'}`}>
                                        {getItemName(item)}
                                    </h3>
                                    <div className={`flex items-center gap-1 text-[9px] md:text-xs mt-0.5 font-bold uppercase tracking-tighter ${isSpace ? 'text-white/40' : 'text-gray-500'}`}>
                                        <div className="flex items-center gap-1 truncate"><FiMapPin size={10} /> {item.location}</div>
                                        <span className="opacity-30">·</span>
                                        <div className="flex items-center gap-1"><FiClock size={10} /> {getItemDate(item) ? new Date(getItemDate(item)!).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <p className={`text-[11px] md:text-sm line-clamp-1 md:line-clamp-2 mt-1 font-medium ${isSpace ? 'text-white/60' : 'text-gray-600'}`}>
                                        {item.description}
                                    </p>
                                    
                                    {item.is_resolved && (
                                        <div className="mt-1">
                                            <span className={`text-[8px] md:text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                                                isSpace ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'
                                            }`}>Resolved</span>
                                        </div>
                                    )}
                                </div>
                                <div className="self-center">
                                    <FiArrowLeft className={`rotate-180 ${isSpace ? 'text-white/20' : 'text-gray-400'}`} size={12} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Create Link */}
            <Link 
                to="/create-item"
                className="fixed bottom-16 right-4 md:bottom-6 md:right-6 w-11 h-11 md:w-14 md:h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group"
            >
                <FiPlus size={20} />
                <span className="absolute right-full mr-3 bg-x-black text-white px-3 py-1.5 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Report an Item</span>
            </Link>
        </div>
    );
};

export default LostFoundFeed;
