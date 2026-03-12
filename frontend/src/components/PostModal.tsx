import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiImage, FiZap, FiWifi, FiSend } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

interface PostModalProps {
  onClose: () => void;
}

const PostModal: React.FC<PostModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (selectedImage) {
        formData.append('images', selectedImage);
      }

      await api.post('/social/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onClose();
      window.location.reload(); 
    } catch (error) {
      alert('Transmission failed. Check node status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="modal-content overflow-visible flex flex-col mx-3 md:mx-0 p-4 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Modular Header */}
        <div className="absolute top-0 left-0 bg-primary/10 px-6 py-2 rounded-br-2xl flex items-center gap-2 border-b border-r border-primary/10">
            <FiWifi className="text-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Live Connection</span>
        </div>

        <div className="flex justify-end mb-2 md:mb-6">
          <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-uv-gray">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-primary/5 rounded-tl-xl rounded-br-xl md:rounded-tl-2xl md:rounded-br-2xl flex items-center justify-center text-primary font-black text-sm md:text-xl border border-primary/20 shrink-0 shadow-inner">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="flex-1 flex flex-col">
            <textarea
              autoFocus
              className="w-full text-base md:text-2xl font-black border-none outline-none resize-none placeholder-primary/20 min-h-[120px] md:min-h-[160px] bg-transparent tracking-tight text-uv-black"
              placeholder="What's the frequency?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {selectedImage && (
              <div className="relative mt-2 mb-6">
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="Data package" 
                  className="rounded-tl-[3rem] rounded-br-[3rem] max-h-[300px] w-full object-cover border-4 border-white shadow-2xl" 
                />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 bg-uv-black/80 text-white p-2 rounded-xl hover:bg-uv-black"
                >
                  <FiX size={20} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-50 mt-2 md:mt-4">
              <div className="flex items-center gap-1.5 md:gap-2">
                <label className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center bg-gray-50 hover:bg-primary/10 hover:text-primary rounded-lg md:rounded-xl cursor-pointer transition-all text-uv-gray">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])}
                  />
                  <FiImage size={20} />
                </label>
                <button className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center bg-gray-50 hover:bg-primary/10 hover:text-primary rounded-lg md:rounded-xl transition-all text-uv-gray group">
                    <FiZap size={20} className="group-hover:fill-primary/10" />
                </button>
              </div>
              
              <button
                disabled={submitting || (!content.trim() && !selectedImage)}
                onClick={handlePost}
                className="uv-button !py-2 !px-6 md:!py-4 md:!px-10 flex items-center gap-2 md:gap-3 text-[10px] md:text-sm"
              >
                {submitting ? 'Transmitting...' : <><FiSend size={16} /> BROADCAST</>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PostModal;
