import { useCallback, useState } from 'react';
import { toImgSrc } from '../utils/resolveMediaUrl';

type Props = {
  /** Tam tarayıcı URL’si (ör. resolveMediaUrl ile) */
  src: string | null | undefined;
  initials: string;
  /** Dış sarmalayıcı — genelde boyut + overflow-hidden */
  className?: string;
  imgClassName?: string;
  alt?: string;
};

/**
 * Avatar URL dolu olsa bile dosya yoksa / 404 ise kırık ikon yerine baş harflere düşer.
 */
export function FeedAvatarImage({
  src,
  initials,
  className = '',
  imgClassName = 'h-full w-full object-cover',
  alt = '',
}: Props) {
  const url = toImgSrc(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImg = Boolean(url) && failedSrc !== url;

  const onError = useCallback(() => {
    setFailedSrc(url ?? '');
  }, [url]);

  if (!showImg) {
    return (
      <span className={`flex h-full w-full items-center justify-center ${className}`.trim()} aria-hidden>
        {initials}
      </span>
    );
  }

  return <img src={url} alt={alt} className={imgClassName} onError={onError} />;
}
