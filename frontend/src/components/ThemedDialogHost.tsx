import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { registerDialogListener, type DialogRequest } from '../utils/themedDialog';

const ThemedDialogHost = () => {
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    registerDialogListener((nextRequest) => {
      setPromptValue(nextRequest.defaultValue ?? '');
      setRequest(nextRequest);
    });

    return () => registerDialogListener(null);
  }, []);

  if (!request) {
    return null;
  }

  const closeAlert = () => {
    request.resolve(undefined);
    setRequest(null);
  };

  const closeConfirm = (value: boolean) => {
    request.resolve(value);
    setRequest(null);
  };

  const closePrompt = (value: string | null) => {
    request.resolve(value);
    setRequest(null);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className={`absolute inset-0 ${isSpace ? 'bg-black/70' : 'bg-black/45'}`}
        onClick={() => {
          if (request.type === 'alert') {
            closeAlert();
          } else if (request.type === 'confirm') {
            closeConfirm(false);
          } else {
            closePrompt(null);
          }
        }}
      />
      <div
        className={`relative w-full max-w-md rounded-3xl border p-5 shadow-2xl ${
          isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'
        }`}
      >
        <h3 className={`text-lg font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
          {request.title || t('notifications.title')}
        </h3>
        <p className={`mt-2 text-sm ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
          {request.message}
        </p>

        {request.type === 'prompt' ? (
          <input
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            className={`mt-4 w-full px-4 py-3 rounded-2xl outline-none border ${
              isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border text-uv-black'
            }`}
          />
        ) : null}

        <div className="mt-4 flex gap-2 justify-end">
          {request.type !== 'alert' ? (
            <button
              type="button"
              onClick={() => (request.type === 'confirm' ? closeConfirm(false) : closePrompt(null))}
              className={`px-4 py-2 rounded-2xl font-black border ${
                isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
              }`}
            >
              {t('common.cancel')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (request.type === 'alert') {
                closeAlert();
              } else if (request.type === 'confirm') {
                closeConfirm(true);
              } else {
                closePrompt(promptValue);
              }
            }}
            className="px-4 py-2 rounded-2xl bg-primary text-white font-black hover:brightness-95 transition-all"
          >
            {request.type === 'alert' ? t('common.ok') : t('common.approve')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemedDialogHost;
