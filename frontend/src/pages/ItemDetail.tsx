import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FiMapPin, FiClock, FiCheckCircle, FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { LostFoundPlaceholder, type LostFoundVisualKind } from '../components/lostFound/LostFoundPlaceholder';

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
    const [openMenu, setOpenMenu] = useState(false);
    const [mainImageFailed, setMainImageFailed] = useState(false);
    const [thumbFailed, setThumbFailed] = useState<Record<number, boolean>>({});

    const resolvedImages = useMemo(() => images.map((u) => resolveMediaUrl(u)), [images]);

    useEffect(() => {
        fetchItem();
        fetchComments();
    }, [type, id]);

    useEffect(() => {
        setActiveImg(0);
    }, [type, id]);

    useEffect(() => {
        setMainImageFailed(false);
        setThumbFailed({});
    }, [images]);

    useEffect(() => {
        setMainImageFailed(false);
    }, [activeImg]);

    const fetchItem = async () => {
        try {
            const endpoint = type === 'lost' ? '/services/lost-items' : '/services/found-items';
            const allRes = await api.get(endpoint, { params: { limit: 100 } });
            const idKey = type === 'lost' ? 'lost_item_id' : 'found_item_id';
            const found = allRes.data.items.find((i: any) => i[idKey] === parseInt(id!));
            setItem(found);

            try {
                const imagesRes = await api.get(`/services/${type}/${id}/images`);
                if (imagesRes.data.images && imagesRes.data.images.length > 0) {
                    setImages(imagesRes.data.images);
                } else if (found?.imageUrl) {
                    setImages([found.imageUrl]);
                }
            } catch {
                if (found?.imageUrl) setImages([found.imageUrl]);
            }
        } catch (err) {
            console.error('Failed to fetch item', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`/services/${type}/${id}/comments`);
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
            await api.post(`/services/${type}/${id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error('Failed to add comment', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!(await themedConfirm('Are you sure you want to delete this report?'))) return;
        try {
            const endpoint = type === 'lost' ? `/services/lost-items/${id}` : `/services/found-items/${id}`;
            await api.delete(endpoint);
            navigate('/lost-found');
        } catch {
            await themedAlert('Failed to delete report');
        }
    };

    const handleCopyLink = async () => {
        navigator.clipboard.writeText(window.location.href);
        await themedAlert('Link copied!');
        setOpenMenu(false);
    };

    const handleResolve = async () => {
        try {
            const endpoint = type === 'lost' ? `/services/lost-items/${id}/resolve` : `/services/found-items/${id}/resolve`;
            await api.patch(endpoint);
            navigate('/lost-found');
        } catch (err) {
            console.error('Failed to resolve', err);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Loading item details...</div>;
    if (!item) return <div className="p-10 text-center text-red-500 font-bold">Item not found.</div>;

    const itemName = item.lost_item_name || item.found_item_name;
    const itemDate = item.lost_date || item.found_date;
    const isOwner = item.user_id === user?.userId;
    const visualKind: LostFoundVisualKind = item.is_resolved ? 'resolved' : type === 'lost' ? 'lost' : 'found';

    return (
        <div className="flex flex-col min-h-screen">
            <div className="sticky top-0 premium-blur border-b border-x-border z-10 px-4 py-2 flex items-center gap-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <FiArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-black">Post</h2>
                    <span className="text-gray-500 text-xs">Community Report</span>
                </div>
            </div>

            <div className="p-4">
                <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-primary font-bold shrink-0 text-xl">
                        {item.poster_email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="font-bold hover:underline cursor-pointer">
                                    {item.poster_email?.split('@')[0] || 'Community Member'}
                                </span>
                                <span className="text-gray-500 text-sm">@{item.poster_email?.split('@')[0] || 'anonymous'}</span>
                            </div>
                            <div className="relative">
                                <button 
                                    onClick={() => setOpenMenu(!openMenu)}
                                    className="text-gray-400 p-2 hover:bg-blue-50 hover:text-primary rounded-full transition-colors"
                                >
                                    <FiMoreHorizontal />
                                </button>
                                {openMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-uv-border rounded-xl shadow-xl z-20 py-2">
                                        <button 
                                            onClick={handleCopyLink}
                                            className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-uv-black hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            Copy Link
                                        </button>
                                        {isOwner && (
                                            <button 
                                                onClick={handleDelete}
                                                className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                Delete Report
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-black">{itemName}</h1>
                    <div className="flex flex-wrap gap-4 text-gray-500 text-sm">
                        <div className="flex items-center gap-1.5"><FiMapPin /> {item.location}</div>
                        <div className="flex items-center gap-1.5"><FiClock /> {itemDate ? new Date(itemDate).toLocaleDateString() : 'N/A'}</div>
                    </div>

                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    
                    <div className="h-[1px] bg-gray-100 my-4" />

                    {/* Image Viewer — boş veya kırık URL için tür bazlı SVG */}
                    <div className="space-y-2">
                        {resolvedImages.length === 0 ? (
                            <div className="flex aspect-video items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-primary">
                                <LostFoundPlaceholder kind={visualKind} className="scale-[1.75]" />
                            </div>
                        ) : (
                            <>
                                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 text-primary">
                                    {mainImageFailed ? (
                                        <LostFoundPlaceholder kind={visualKind} className="scale-[1.75]" />
                                    ) : (
                                        <img
                                            src={resolvedImages[activeImg]}
                                            alt={itemName}
                                            className="max-h-full w-full object-contain"
                                            onError={() => setMainImageFailed(true)}
                                        />
                                    )}
                                </div>
                                {resolvedImages.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {resolvedImages.map((img, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setActiveImg(i)}
                                                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                                                    activeImg === i ? 'border-primary' : 'border-transparent'
                                                }`}
                                            >
                                                {thumbFailed[i] ? (
                                                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-primary">
                                                        <LostFoundPlaceholder kind={visualKind} />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={img}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                        onError={() =>
                                                            setThumbFailed((prev) => ({ ...prev, [i]: true }))
                                                        }
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {item.is_resolved && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-2xl flex items-center gap-3">
                            <FiCheckCircle size={20} />
                            <span className="font-bold">This item has been resolved and returned!</span>
                        </div>
                    )}

                    {isOwner && !item.is_resolved && (
                        <button
                            onClick={handleResolve}
                            className="w-full bg-green-600 text-white font-black py-4 rounded-2xl hover:brightness-95 transition-all shadow-lg shadow-green-600/20"
                        >
                            Mark as Resolved
                        </button>
                    )}

                    <div className="h-[1px] bg-gray-100 my-4" />

                    {/* Comments Section */}
                    <div>
                        <h3 className="font-black text-xl mb-6">Replies</h3>
                        
                        <form onSubmit={handleAddComment} className="flex gap-4 mb-8">
                             <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-primary font-bold shrink-0">
                                {user?.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1 flex flex-col">
                                <textarea 
                                    className="w-full text-lg border-none outline-none resize-none pt-2"
                                    placeholder="Post your reply"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    rows={1}
                                />
                                <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                                    <button 
                                        disabled={!newComment.trim() || submitting}
                                        className="bg-primary text-white font-bold px-6 py-2 rounded-full disabled:opacity-50 hover:brightness-95 transition-all"
                                    >
                                        Reply
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="space-y-6 mb-20">
                             {comments.length === 0 ? (
                                <p className="text-center text-gray-400 font-medium py-10">No replies yet. Be the first!</p>
                             ) : (
                                comments.map(c => (
                                    <div key={c.comment_id} className="flex gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold shrink-0">
                                            {c.email[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <span className="font-bold text-gray-900 truncate">@{c.email.split('@')[0]}</span>
                                                <span className="text-gray-500">·</span>
                                                <span className="text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[15px] text-gray-900 mt-0.5">{c.content}</p>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetail;
