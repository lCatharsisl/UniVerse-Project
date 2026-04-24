import { useCallback, useState } from 'react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { LostFoundPlaceholder, type LostFoundVisualKind } from './LostFoundPlaceholder';

type Props = {
  imageUrl: string | null | undefined;
  /** Liste öğesi: lost | found | resolved sekmesine göre */
  kind: LostFoundVisualKind;
  alt: string;
  className?: string;
};

/**
 * Kapak görseli yoksa veya yükleme hatasında varsayılan SVG gösterir.
 */
export function LostFoundItemImage({ imageUrl, kind, alt, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = (imageUrl && resolveMediaUrl(imageUrl)) || '';
  const showImg = Boolean(resolved.trim()) && !failed;

  const onError = useCallback(() => setFailed(true), []);

  if (!showImg) {
    return (
      <div className={`flex h-full w-full items-center justify-center text-primary ${className}`.trim()} aria-hidden>
        <LostFoundPlaceholder kind={kind} />
      </div>
    );
  }

  return <img src={resolved} alt={alt} className={`h-full w-full object-cover ${className}`.trim()} onError={onError} />;
}
