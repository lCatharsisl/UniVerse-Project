import { useEffect, useState } from 'react';
import api from '../api/client';
import { Link } from 'react-router-dom';
import { FiPlus, FiMapPin, FiClock, FiSearch, FiPackage } from 'react-icons/fi';
import Header from '../components/Header';

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
    imageUrl?: string;
}

const LostFoundFeed = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [activeTab, setActiveTab] = useState<'lost' | 'found'>('lost');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'lost' ? '/lost-items' : '/found-items';
            const res = await api.get(endpoint, { params: { isResolved: false, limit: 50 } });
            setItems(res.data.items || []);
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
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Sub-header / Search */}
            <div className="bg-white border-b border-gray-200 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Community Feed</h1>
                            <p className="text-gray-500 text-sm mt-1">Check out lost and found items on campus</p>
                        </div>

                        <div className="relative w-full md:w-80">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search items or locations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-8 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('lost')}
                            className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'lost'
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            Lost Items
                            {activeTab === 'lost' && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('found')}
                            className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'found'
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            Found Items
                            {activeTab === 'found' && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-100 border-dashed">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
                            <FiPackage className="text-gray-400" size={20} />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">No items found</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                            {searchQuery ? 'Try adjusting your search terms' : 'Be the first to post an item'}
                        </p>
                        {!searchQuery && (
                            <Link to="/create-item" className="text-blue-600 font-medium text-sm hover:underline">
                                Create a new post
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredItems.map((item) => (
                            <Link
                                key={getItemId(item)}
                                to={`/item/${activeTab}/${getItemId(item)}`}
                                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Image */}
                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={getItemName(item)}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <FiPackage size={32} />
                                        </div>
                                    )}
                                    {item.is_resolved && (
                                        <span className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                            Resolved
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                        {getItemName(item)}
                                    </h3>
                                    <div className="flex items-center text-xs text-gray-500 gap-3 mb-3">
                                        <span className="flex items-center gap-1 truncate max-w-[50%]">
                                            <FiMapPin size={12} /> {item.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FiClock size={12} />
                                            {getItemDate(item) ? new Date(getItemDate(item)!).toLocaleDateString() : '-'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {item.description || 'No description provided.'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Action Button (Mobile) */}
            <Link
                to="/create-item"
                className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg 
                   flex items-center justify-center hover:bg-blue-700 transition-colors md:hidden"
            >
                <FiPlus size={24} />
            </Link>
        </div>
    );
};

export default LostFoundFeed;
