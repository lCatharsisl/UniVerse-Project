export type DialogType = 'alert' | 'confirm' | 'prompt';

export type DialogRequest = {
  type: DialogType;
  title?: string;
  message: string;
  defaultValue?: string;
  resolve: (value: unknown) => void;
};

type DialogListener = (request: DialogRequest) => void;

let listener: DialogListener | null = null;

export function registerDialogListener(fn: DialogListener | null) {
  listener = fn;
}

function requestDialog(type: DialogType, message: string, title?: string, defaultValue?: string) {
  return new Promise<unknown>((resolve) => {
    const request: DialogRequest = { type, title, message, defaultValue, resolve };

    if (listener) {
      listener(request);
      return;
    }

    if (type === 'alert') {
      window.alert(message);
      resolve(undefined);
      return;
    }

    if (type === 'confirm') {
      resolve(window.confirm(message));
      return;
    }

    resolve(window.prompt(message, defaultValue ?? '') ?? null);
  });
}

export function themedAlert(message: string, title?: string): Promise<void> {
  return requestDialog('alert', message, title) as Promise<void>;
}

export function themedConfirm(message: string, title?: string): Promise<boolean> {
  return requestDialog('confirm', message, title) as Promise<boolean>;
}

export function themedPrompt(message: string, title?: string, defaultValue?: string): Promise<string | null> {
  return requestDialog('prompt', message, title, defaultValue) as Promise<string | null>;
}
