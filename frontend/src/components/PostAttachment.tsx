import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isPostVideoUrl, videoSrcWithFirstFrameHint } from '../utils/postMedia';
import { toImgSrc } from '../utils/resolveMediaUrl';

type PostAttachmentProps = {
  path: string;
  /** API’den ayrı bir poster görseli gelirse (ileride); yoksa video karesinden üretilir */
  posterUrl?: string | null;
  className?: string;
  mediaClassName?: string;
  onClick?: () => void;
};

const POSTER_MAX_SIDE = 720;
const JPEG_QUALITY = 0.78;

function captureVideoFrameToPosterDataUrl(video: HTMLVideoElement): string | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, POSTER_MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h, 0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

type PostVideoPlayerProps = {
  src: string;
  resolvedPropPoster?: string;
  className: string;
  mediaClassName?: string;
  onClick?: () => void;
  onVideoError: () => void;
};

/** `PostAttachment` içinde `key={path}` ile kullanılır; poster state path değişince sıfırlanır */
const PostVideoPlayer: React.FC<PostVideoPlayerProps> = ({
  src,
  resolvedPropPoster,
  className,
  mediaClassName,
  onClick,
  onVideoError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureDoneRef = useRef(false);
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);
  const [useSrcFragmentHint, setUseSrcFragmentHint] = useState(false);

  useEffect(() => {
    if (resolvedPropPoster) return;

    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    const finishCapture = () => {
      if (cancelled || captureDoneRef.current) return;
      try {
        const dataUrl = captureVideoFrameToPosterDataUrl(el);
        if (dataUrl && dataUrl.length > 32) {
          captureDoneRef.current = true;
          setGeneratedPoster(dataUrl);
          try {
            el.currentTime = 0;
          } catch {
            /* ignore */
          }
          return true;
        }
      } catch {
        /* CORS / tainted canvas */
      }
      return false;
    };

    const onSeeked = () => {
      if (cancelled || captureDoneRef.current) return;
      if (!finishCapture()) {
        setUseSrcFragmentHint(true);
      }
      el.removeEventListener('seeked', onSeeked);
    };

    const onLoadedMetadata = () => {
      if (cancelled || captureDoneRef.current) return;
      const d = el.duration;
      const t =
        Number.isFinite(d) && d > 0
          ? Math.min(2, Math.max(0.05, d * 0.03))
          : 0.1;
      el.addEventListener('seeked', onSeeked);
      try {
        el.currentTime = t;
      } catch {
        el.removeEventListener('seeked', onSeeked);
        if (!finishCapture()) setUseSrcFragmentHint(true);
      }
    };

    el.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });

    const timeoutId = window.setTimeout(() => {
      if (cancelled || captureDoneRef.current) return;
      el.removeEventListener('seeked', onSeeked);
      setUseSrcFragmentHint(true);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('seeked', onSeeked);
    };
  }, [src, resolvedPropPoster]);

  const base = (mediaClassName ?? 'max-h-48 md:max-h-[512px] w-full').replace(
    /\bobject-cover\b/g,
    'object-contain'
  );
  const videoMc = base.includes('object-') ? `${base} bg-black` : `${base} object-contain bg-black`;
  const posterAttr = resolvedPropPoster ?? generatedPoster ?? undefined;
  const videoSrc =
    useSrcFragmentHint && !posterAttr ? videoSrcWithFirstFrameHint(src) : src;

  return (
    <div
      className={className}
      onClick={
        onClick
          ? (e) => {
              if ((e.target as HTMLElement).closest('video')) return;
              onClick();
            }
          : undefined
      }
    >
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterAttr}
        controls
        playsInline
        crossOrigin="anonymous"
        className={videoMc}
        preload="metadata"
        onError={onVideoError}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const PostAttachment: React.FC<PostAttachmentProps> = ({
  path,
  posterUrl: posterUrlProp,
  className = '',
  mediaClassName,
  onClick,
}) => {
  const src = toImgSrc(path);
  const video = isPostVideoUrl(path);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const mediaFailed = failedPath === path;
  const imgMc =
    mediaClassName ?? 'max-h-48 md:max-h-[512px] w-full object-cover';

  const resolvedPropPoster = posterUrlProp ? toImgSrc(posterUrlProp) : undefined;

  const onVideoError = useCallback(() => {
    setFailedPath(path);
  }, [path]);

  const onImgError = useCallback(() => {
    setFailedPath(path);
  }, [path]);

  if (mediaFailed || !src) {
    return null;
  }

  if (video) {
    return (
      <PostVideoPlayer
        key={path}
        src={src}
        resolvedPropPoster={resolvedPropPoster}
        className={className}
        mediaClassName={mediaClassName}
        onClick={onClick}
        onVideoError={onVideoError}
      />
    );
  }

  return (
    <div className={className} onClick={onClick}>
      <img src={src} loading="lazy" className={imgMc} alt="" onError={onImgError} />
    </div>
  );
};

export default PostAttachment;
