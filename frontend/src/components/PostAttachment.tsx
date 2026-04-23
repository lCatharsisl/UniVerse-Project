import React, { useCallback, useEffect, useState } from 'react';
import { isPostVideoUrl } from '../utils/postMedia';
import { toImgSrc } from '../utils/resolveMediaUrl';

type PostAttachmentProps = {
  path: string;
  /** Wrapper (e.g. rounded border container) */
  className?: string;
  /** Classes on the img or video element */
  mediaClassName?: string;
};

const PostAttachment: React.FC<PostAttachmentProps> = ({ path, className = '', mediaClassName }) => {
  const [mediaFailed, setMediaFailed] = useState(false);
  const src = toImgSrc(path);
  const video = isPostVideoUrl(path);
  const imgMc =
    mediaClassName ?? 'max-h-48 md:max-h-[512px] w-full object-cover';

  useEffect(() => {
    setMediaFailed(false);
  }, [path]);

  const onVideoError = useCallback(() => {
    setMediaFailed(true);
  }, []);

  const onImgError = useCallback(() => {
    setMediaFailed(true);
  }, []);

  if (mediaFailed || !src) {
    return null;
  }

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
          onError={onVideoError}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <img src={src} loading="lazy" className={imgMc} alt="" onError={onImgError} />
    </div>
  );
};

export default PostAttachment;
