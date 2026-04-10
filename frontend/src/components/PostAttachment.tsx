import React from 'react';
import { isPostVideoUrl, resolveSocialPostMediaUrl } from '../utils/postMedia';

type PostAttachmentProps = {
  path: string;
  /** Wrapper (e.g. rounded border container) */
  className?: string;
  /** Classes on the img or video element */
  mediaClassName?: string;
};

const PostAttachment: React.FC<PostAttachmentProps> = ({ path, className = '', mediaClassName }) => {
  const src = resolveSocialPostMediaUrl(path);
  const video = isPostVideoUrl(path);
  const imgMc =
    mediaClassName ?? 'max-h-48 md:max-h-[512px] w-full object-cover';

  if (video) {
    const base = (mediaClassName ?? 'max-h-48 md:max-h-[512px] w-full').replace(
      /\bobject-cover\b/g,
      'object-contain'
    );
    const videoMc = base.includes('object-') ? `${base} bg-black` : `${base} object-contain bg-black`;
    return (
      <div className={className}>
        <video
          src={src}
          controls
          playsInline
          className={videoMc}
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <img src={src} loading="lazy" className={imgMc} alt="" />
    </div>
  );
};

export default PostAttachment;
