export type DialogType = 'alert' | 'confirm' | 'prompt';

export type DialogRequest = {
  type: DialogType;
  title?: string;
  message: string;
  defaultValue?: string;
  resolve: (value: any) => void;
};

type DialogListener = (request: DialogRequest) => void;

let listener: DialogListener | null = null;

export function registerDialogListener(fn: DialogListener | null) {
  listener = fn;
}

function requestDialog(type: DialogType, message: string, title?: string, defaultValue?: string) {
  return new Promise<any>((resolve) => {
    const req: DialogRequest = { type, title, message, defaultValue, resolve };
    if (listener) {
      listener(req);
      return;
    }
    // Fallback when host is not mounted.
    if (type === 'alert') {
      window.alert(message);
      resolve(undefined);
    } else if (type === 'confirm') {
      resolve(window.confirm(message));
    } else {
      resolve(window.prompt(message, defaultValue ?? '') ?? null);
    }
  });
}

export function themedAlert(message: string, title?: string): Promise<void> {
  return requestDialog('alert', message, title);
}

export function themedConfirm(message: string, title?: string): Promise<boolean> {
  return requestDialog('confirm', message, title);
}

export function themedPrompt(message: string, title?: string, defaultValue?: string): Promise<string | null> {
  return requestDialog('prompt', message, title, defaultValue);
}

