import React from 'react';

/** Ana sütun içi — chunk yüklenirken tüm ekran spinner yerine aynı arka plan tonu (yanıp sönme yok) */
const RouteContentFallback: React.FC<{
  isSpace: boolean;
  isMessages: boolean;
}> = ({ isSpace, isMessages }) => (
  <div
    className={`w-full ${
      isMessages ? 'min-h-0 flex-1' : 'min-h-[min(70vh,800px)]'
    } ${
      isSpace ? 'bg-[#0a0a1a]/35' : 'bg-slate-50/90'
    } rounded-none md:rounded-b-none`}
    aria-hidden
  />
);

export default RouteContentFallback;
