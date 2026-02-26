import { useState, useEffect } from 'react';
import api from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiX, FiMapPin, FiCalendar, FiPackage, FiArrowLeft } from 'react-icons/fi';

const CreateItem = () => {
    const navigate = useNavigate();
    const { type: editType, id: editId } = useParams<{ type?: 'lost' | 'found'; id?: string }>();
    const [type, setType] = useState<'lost' | 'found'>((editType as 'lost' | 'found') || 'lost');
    const [formData, setFormData] = useState({
        itemName: '',
        location: '',
        description: '',
        date: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!editId;

    useEffect(() => {
        if (isEditing) {
            fetchItemData();
        }
    }, [editId]);

    const fetchItemData = async () => {
        setFetching(true);
        try {
            const endpoint = editType === 'lost' ? '/services/lost-items' : '/services/found-items';
            const allRes = await api.get(endpoint, { params: { limit: 100 } });
            const idKey = editType === 'lost' ? 'lost_item_id' : 'found_item_id';
            const found = allRes.data.items.find((i: any) => i[idKey] === parseInt(editId!));
            
            if (found) {
                setFormData({
                    itemName: found.lost_item_name || found.found_item_name || '',
                    location: found.location || '',
                    description: found.description || '',
                    date: found.lost_date || found.found_date || '',
                });
                if (found.imageUrl) {
                    setPreviews([found.imageUrl]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch item data', err);
        } finally {
            setFetching(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImages((prev) => [...prev, ...files].slice(0, 5));

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews((prev) => [...prev, reader.result as string].slice(0, 5));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = new FormData();
            data.append(type === 'lost' ? 'lostItemName' : 'foundItemName', formData.itemName);
            data.append('location', formData.location);
            data.append('description', formData.description);
            if (formData.date) {
                data.append(type === 'lost' ? 'lostDate' : 'foundDate', new Date(formData.date).toISOString());
            }
            images.forEach((img) => data.append('images', img));

            if (isEditing) {
                // For editing, we might need a specific PATCH endpoint. 
                // Assuming services support patch/put.
                const endpoint = type === 'lost' ? `/services/lost-items/${editId}` : `/services/found-items/${editId}`;
                await api.patch(endpoint, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                const endpoint = type === 'lost' ? '/services/lost-items' : '/services/found-items';
                await api.post(endpoint, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            navigate('/lost-found');
        } catch (err: any) {
            setError(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} post`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-10 text-center text-gray-400">Loading item data...</div>;

    return (
        <div className="flex flex-col min-h-screen">
            <div className="sticky top-0 premium-blur border-b border-x-border z-10 px-4 py-3 flex items-center gap-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <FiArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-black">{isEditing ? 'Edit Report' : 'Report an Item'}</h2>
                    <span className="text-gray-500 text-xs">{isEditing ? 'Keep information up to date' : 'Help the UniVerse community'}</span>
                </div>
            </div>

            <div className="p-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Type Selection - Disable if editing */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                        <button
                            type="button"
                            disabled={isEditing}
                            onClick={() => setType('lost')}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 'lost' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            I Lost Something
                        </button>
                        <button
                            type="button"
                            disabled={isEditing}
                            onClick={() => setType('found')}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 'found' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            I Found Something
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <FiPackage className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Item Name (e.g. Silver Ring)"
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-1 focus:ring-primary outline-none transition-all"
                                value={formData.itemName}
                                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="relative">
                            <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Where?"
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-1 focus:ring-primary outline-none transition-all"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                        </div>

                        <div className="relative">
                            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-1 focus:ring-primary outline-none transition-all"
                                value={formData.date ? formData.date.split('T')[0] : ''}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <textarea
                            placeholder="Describe the item (color, brand, unique features...)"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-1 focus:ring-primary outline-none transition-all min-h-[120px] resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <h4 className="text-sm font-bold mb-3">Add Photos</h4>
                        <div className="flex flex-wrap gap-4">
                            {previews.map((src, i) => (
                                <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100">
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                                    >
                                        <FiX size={12} />
                                    </button>
                                </div>
                            ))}
                            {previews.length < 5 && (
                                <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-primary hover:bg-blue-50 transition-all text-gray-400">
                                    <FiUpload size={20} />
                                    <span className="text-[10px] mt-1 font-bold">Upload</span>
                                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isEditing ? 'Update Report' : 'Post Report')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateItem;
