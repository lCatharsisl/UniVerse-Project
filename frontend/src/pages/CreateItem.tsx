import { useState } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiX, FiMapPin, FiCalendar, FiPackage, FiArrowLeft } from 'react-icons/fi';
import Header from '../components/Header';

const CreateItem = () => {
    const navigate = useNavigate();
    const [type, setType] = useState<'lost' | 'found'>('lost');
    const [formData, setFormData] = useState({
        itemName: '',
        location: '',
        description: '',
        date: '',
    });
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

            const endpoint = type === 'lost' ? '/lost-items' : '/found-items';
            await api.post(endpoint, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            navigate('/feed');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <FiArrowLeft /> Back
                </button>

                <div className="minimal-card">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-gray-900">Create New Post</h1>
                        <p className="text-sm text-gray-500">Share details about the item</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Type Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setType('lost')}
                                className={`p-4 rounded-lg border text-left transition-all ${type === 'lost'
                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-semibold text-gray-900">Lost Item</div>
                                <div className="text-xs text-gray-500 mt-1">I lost something</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('found')}
                                className={`p-4 rounded-lg border text-left transition-all ${type === 'found'
                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-semibold text-gray-900">Found Item</div>
                                <div className="text-xs text-gray-500 mt-1">I found something</div>
                            </button>
                        </div>

                        {/* Inputs */}
                        <div>
                            <label className="minimal-label">Item Name</label>
                            <div className="relative">
                                <FiPackage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.itemName}
                                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                    className="minimal-input pl-10"
                                    placeholder="e.g. Black Leather Wallet"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="minimal-label">Location</label>
                                <div className="relative">
                                    <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="minimal-input pl-10"
                                        placeholder="e.g. Library"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="minimal-label">Date</label>
                                <div className="relative">
                                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="minimal-input pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="minimal-label">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="minimal-input min-h-[100px] resize-none"
                                placeholder="Provide more details..."
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="minimal-label">Photos (Max 5)</label>
                            <div className="flex flex-wrap gap-3 mt-2">
                                {previews.map((src, i) => (
                                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(i)}
                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                                        >
                                            <FiX size={12} />
                                        </button>
                                    </div>
                                ))}
                                {previews.length < 5 && (
                                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                        <FiUpload className="text-gray-400" size={20} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="minimal-btn disabled:opacity-70"
                        >
                            {loading ? 'Posting...' : 'Post Item'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateItem;
