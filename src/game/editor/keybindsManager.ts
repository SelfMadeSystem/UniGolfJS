type ShortcutModifiers = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type ShortcutBinding = ShortcutModifiers & {
  key: string;
  allowRepeat?: boolean;
};

type RegisteredShortcut = {
  binding: ShortcutBinding;
  handler: (event: KeyboardEvent) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function matchesBinding(
  event: KeyboardEvent,
  binding: ShortcutBinding,
): boolean {
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const bindingKey =
    binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;

  return (
    eventKey === bindingKey &&
    (binding.ctrl ?? false) === event.ctrlKey &&
    (binding.shift ?? false) === event.shiftKey &&
    (binding.alt ?? false) === event.altKey &&
    (binding.meta ?? false) === event.metaKey
  );
}

export class KeybindsManager {
  private shortcuts: RegisteredShortcut[] = [];

  register(
    binding: ShortcutBinding,
    handler: (event: KeyboardEvent) => void,
  ): void {
    this.shortcuts.push({ binding, handler });
  }

  handle(event: KeyboardEvent): boolean {
    if (isEditableTarget(event.target)) return false;

    const shortcut = this.shortcuts.find(({ binding }) =>
      matchesBinding(event, binding),
    );
    if (!shortcut) return false;

    if (event.repeat && !shortcut.binding.allowRepeat) return false;

    shortcut.handler(event);
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
}
