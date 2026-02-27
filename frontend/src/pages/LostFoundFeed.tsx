import { useEffect, useState } from 'react';
import api from '../api/client';
import { Link } from 'react-router-dom';
import { FiPlus, FiMapPin, FiClock, FiSearch, FiPackage, FiArrowLeft } from 'react-icons/fi';

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
    const [items, setItems] = useState<Item[]>([]);
    const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'resolved'>('lost');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <div className="sticky top-0 premium-blur border-b border-x-border z-10 px-4 py-3">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-black">Lost & Found</h2>
                    <div className="flex-1 max-w-xs relative shrink-0">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-gray-100 border-none rounded-full text-xs outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
                        />
                    </div>
                </div>
                
                <div className="flex mt-3">
                    {['lost', 'found', 'resolved'].map((tab) => (
                         <div 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 text-center text-sm font-bold pb-2 cursor-pointer transition-colors relative capitalize ${activeTab === tab ? 'text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                         >
                            {tab} Items
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full mx-4" />}
                         </div>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col mb-20">
                {loading ? (
                    <div className="p-10 text-center text-gray-400 animate-pulse">Searching the lost items...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-20 text-center text-gray-500 font-medium">
                         <FiPackage size={40} className="mx-auto mb-4 opacity-20" />
                         <p>No items found here.</p>
                         <Link to="/create-item" className="text-primary hover:underline text-sm font-bold mt-2 inline-block">Post an item</Link>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {filteredItems.map(item => (
                            <Link
                                key={getItemId(item)}
                                to={`/item/${item.__type || activeTab}/${getItemId(item)}`}
                                className="p-4 hover:bg-gray-50 transition-colors flex gap-4 premium-card"
                            >
                                <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={getItemName(item)} className="w-full h-full object-cover" />
                                    ) : (
                                        <FiPackage size={24} className="text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="font-bold text-gray-900 truncate">
                                        {getItemName(item)}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                        <div className="flex items-center gap-1 truncate"><FiMapPin /> {item.location}</div>
                                        <span>·</span>
                                        <div className="flex items-center gap-1"><FiClock /> {getItemDate(item) ? new Date(getItemDate(item)!).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 mt-1.5">
                                        {item.description}
                                    </p>
                                    
                                    {item.is_resolved && (
                                        <div className="mt-2">
                                            <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Resolved</span>
                                        </div>
                                    )}
                                </div>
                                <div className="self-center">
                                    <FiArrowLeft className="rotate-180 text-gray-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Create Link */}
            <Link 
                to="/create-item"
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group"
            >
                <FiPlus size={24} />
                <span className="absolute right-full mr-3 bg-x-black text-white px-3 py-1.5 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Report an Item</span>
            </Link>
        </div>
    );
};

export default LostFoundFeed;
