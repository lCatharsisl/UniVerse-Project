import { useEffect, useRef, useState } from 'react';

/** Mesajlar inbox görünürken iOS klavye/viewport ölçümünü sıfırla */
export const UV_RESET_VISUAL_VIEWPORT_EVENT = 'uv-reset-visual-viewport-layout';

/**
 * Klavye kapalıyken adres çubuğu / güvenli alan için `instant - visualBottom` küçük kalır.
 * Klavye açılınca iOS bazen birkaç saniye sonra `innerHeight`'ı görsel viewport ile hizalar;
 * o anda ölçüm sıfıra yaklaşır — alt tab geri gelir, içerik klavyenin altına “kayar”.
 */
const layoutPeakRef = { current: 0 };

function readObscuredBottomRaw(): number {
  if (typeof window === 'undefined' || !window.visualViewport) return 0;
  const vv = window.visualViewport;
  const docH = document.documentElement?.clientHeight ?? 0;
  const ih = window.innerHeight;
  const instant = Math.max(ih, docH);
  const quick = Math.max(0, instant - vv.offsetTop - vv.height);

  if (quick <= 64) {
    layoutPeakRef.current = instant;
    return quick;
  }

  layoutPeakRef.current = Math.max(layoutPeakRef.current, instant);
  const layoutH = Math.max(layoutPeakRef.current, instant);

  if (instant < layoutH * 0.88) {
    return Math.min(quick, Math.floor(instant * 0.92));
  }

  const expanded = Math.max(0, layoutH - vv.offsetTop - vv.height);
  return Math.min(expanded, Math.floor(layoutH * 0.92));
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export type VisualKeyboardInset = {
  obscuredBottom: number;
  isKeyboardObscuring: boolean;
  editableFieldFocused: boolean;
};

/**
 * iOS Safari / mobil: görsel viewport ile layout altı (klavye).
 */
export function useVisualKeyboardInset(): VisualKeyboardInset {
  const [rawObscured, setRawObscured] = useState(0);
  const [editableFieldFocused, setEditableFieldFocused] = useState(false);
  const obscuredPeakSessionRef = useRef(0);
  const editableRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    const update = () => {
      const raw = readObscuredBottomRaw();
      setRawObscured(raw);
      if (raw > 64) {
        obscuredPeakSessionRef.current = Math.max(obscuredPeakSessionRef.current, raw);
      }
    };

    /** iOS: visualViewport kayması içeriği klavyenin altına iter */
    const onVisualViewportScroll = () => {
      if (!window.visualViewport) return;
      const top = window.visualViewport.offsetTop;
      if (top <= 1) return;
      const raw = readObscuredBottomRaw();
      const keyboardy =
        raw > 120 ||
        (editableRef.current && (raw > 72 || obscuredPeakSessionRef.current > 72));
      if (!keyboardy) return;
      window.scrollTo(0, window.scrollY + top);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isEditableTarget(e.target)) return;
      editableRef.current = true;
      setEditableFieldFocused(true);
    };

    const onFocusOut = () => {
      window.requestAnimationFrame(() => {
        if (isEditableTarget(document.activeElement)) return;
        editableRef.current = false;
        setEditableFieldFocused(false);
        window.setTimeout(() => {
          const raw = readObscuredBottomRaw();
          if (raw < 48) obscuredPeakSessionRef.current = 0;
          setRawObscured(raw);
        }, 220);
      });
    };

    const hardResetLayout = () => {
      obscuredPeakSessionRef.current = 0;
      editableRef.current = false;
      setEditableFieldFocused(false);
      const ih = window.innerHeight;
      const docH = document.documentElement?.clientHeight ?? 0;
      layoutPeakRef.current = Math.max(ih, docH);
      update();
      window.scrollTo(0, 0);
    };

    window.addEventListener(UV_RESET_VISUAL_VIEWPORT_EVENT, hardResetLayout);

    layoutPeakRef.current = Math.max(
      layoutPeakRef.current,
      window.innerHeight,
      document.documentElement?.clientHeight ?? 0
    );
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    vv.addEventListener('scroll', onVisualViewportScroll);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      vv.removeEventListener('scroll', onVisualViewportScroll);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener(UV_RESET_VISUAL_VIEWPORT_EVENT, hardResetLayout);
    };
  }, []);

  const obscuredBottom = editableFieldFocused
    ? Math.max(rawObscured, obscuredPeakSessionRef.current)
    : rawObscured;

  /** Yüksek eşik: Safari adres çubuğu dalgalanmasını klavye sanmasın; odak + tepe iOS klavye sıfırlamasına dayanır */
  const isKeyboardObscuring =
    rawObscured > 120 ||
    (editableFieldFocused &&
      (rawObscured > 72 || obscuredPeakSessionRef.current > 72));

  return {
    obscuredBottom,
    isKeyboardObscuring,
    editableFieldFocused,
  };
}
