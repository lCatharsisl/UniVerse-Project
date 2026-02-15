import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FiMapPin, FiClock, FiMessageSquare, FiSend, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import Header from '../components/Header';

interface Comment {
    comment_id: number;
    content: string;
    created_at: string;
    email: string;
}

const ItemDetail = () => {
    const { type, id } = useParams<{ type: 'lost' | 'found'; id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [item, setItem] = useState<any>(null);
    const [images, setImages] = useState<string[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeImg, setActiveImg] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchItem();
        fetchComments();
    }, [type, id]);

    const fetchItem = async () => {
        try {
            const endpoint = type === 'lost' ? '/lost-items' : '/found-items';
            const allRes = await api.get(endpoint, { params: { limit: 100 } });
            const idKey = type === 'lost' ? 'lost_item_id' : 'found_item_id';
            const found = allRes.data.items.find((i: any) => i[idKey] === parseInt(id!));
            setItem(found);

            // Fetch all images for this item
            try {
                const imagesRes = await api.get(`/${type}/${id}/images`);
                if (imagesRes.data.images && imagesRes.data.images.length > 0) {
                    setImages(imagesRes.data.images);
                } else if (found?.imageUrl) {
                    setImages([found.imageUrl]);
                }
            } catch {
                // Fallback to single image if endpoint fails
                if (found?.imageUrl) {
                    setImages([found.imageUrl]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch item', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`/${type}/${id}/comments`);
            setComments(res.data || []);
        } catch (err) {
            console.error('Failed to fetch comments', err);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            await api.post(`/${type}/${id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error('Failed to add comment', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async () => {
        try {
            const endpoint = type === 'lost' ? `/lost-items/${id}/resolve` : `/found-items/${id}/resolve`;
            await api.patch(endpoint);
            navigate('/feed');
        } catch (err) {
            console.error('Failed to resolve', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 bg-gray-50">
                <p className="text-lg font-medium">Item not found</p>
                <button onClick={() => navigate('/feed')} className="minimal-btn w-auto px-6 mt-4">
                    Return to Feed
                </button>
            </div>
        );
    }

    const itemName = item.lost_item_name || item.found_item_name;
    const itemDate = item.lost_date || item.found_date;
    const isOwner = item.lost_by_user_id === user?.userId || item.found_by_user_id === user?.userId;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <FiArrowLeft /> Back to Feed
                </button>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Image Section */}
                    <div className="space-y-4">
                        <div className="aspect-[4/3] bg-white rounded-xl border border-gray-200 overflow-hidden relative">
                            {images.length > 0 ? (
                                <img
                                    src={images[activeImg]}
                                    alt={itemName}
                                    className="w-full h-full object-contain bg-gray-50"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <span className="text-sm">No Image</span>
                                </div>
                            )}
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImg(idx)}
                                        className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all ${activeImg === idx ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="space-y-6">
                        <div className="minimal-card p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{itemName}</h1>
                                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${type === 'lost' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                        {type === 'lost' ? 'Lost Item' : 'Found Item'}
                                    </span>
                                </div>
                                {item.is_resolved && (
                                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                                        <FiCheckCircle /> Resolved
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100 mb-4">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiMapPin className="text-gray-400" />
                                    <span className="text-sm">{item.location}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FiClock className="text-gray-400" />
                                    <span className="text-sm">
                                        {itemDate ? new Date(itemDate).toLocaleDateString() : 'No date'}
                                    </span>
                                </div>
                            </div>

                            {item.poster_email && (
                                <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-bold text-sm">
                                            {item.poster_email[0].toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Posted by</p>
                                        <p className="text-sm font-medium text-gray-900">{item.poster_email.split('@')[0]}</p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {item.description || 'No description provided.'}
                                </p>
                            </div>

                            {isOwner && !item.is_resolved && (
                                <button
                                    onClick={handleResolve}
                                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <FiCheckCircle /> Mark as Resolved
                                </button>
                            )}
                        </div>

                        {/* Comments Section */}
                        <div className="minimal-card p-6">
                            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FiMessageSquare /> Comments ({comments.length})
                            </h2>

                            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 py-4">No comments yet</p>
                                ) : (
                                    comments.map((c) => (
                                        <div key={c.comment_id} className="flex gap-3 text-sm">
                                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                                <span className="font-bold text-xs">{c.email[0].toUpperCase()}</span>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg flex-1">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-medium text-gray-900">{c.email.split('@')[0]}</span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(c.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700">{c.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="minimal-input py-2 text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !newComment.trim()}
                                    className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <FiSend size={16} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ItemDetail;
