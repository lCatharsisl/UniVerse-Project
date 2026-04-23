import { useCallback, useEffect, useState } from 'react';
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
  const [broken, setBroken] = useState(false);
  const url = toImgSrc(src);
  const showImg = Boolean(url) && !broken;

  useEffect(() => {
    setBroken(false);
  }, [url]);

  const onError = useCallback(() => {
    setBroken(true);
  }, []);

  if (!showImg) {
    return (
      <span className={`flex h-full w-full items-center justify-center ${className}`.trim()} aria-hidden>
        {initials}
      </span>
    );
  }

  return <img src={url} alt={alt} className={imgClassName} onError={onError} />;
}
