import React from 'react';
import { createRoot } from 'react-dom/client';
import { EmojiPicker } from 'frimousse';

function insertEmoji(emoji, scope) {
  const field = scope.querySelector('textarea');
  if (!field) return;
  const at = field.selectionStart ?? field.value.length;
  field.setRangeText(emoji, at, field.selectionEnd ?? at, 'end');
  field.focus();
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

export function mount(el, onSelect) {
  const scope = el.closest('form') || document;
  const root = createRoot(el);
  root.render(
    <EmojiPicker.Root columns={8} onEmojiSelect={({ emoji }) => { if (typeof onSelect === 'function') onSelect(emoji); else insertEmoji(emoji, scope); }}>
      <EmojiPicker.Search
        placeholder="Search emoji"
        onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}
      />
      <EmojiPicker.Viewport>
        <EmojiPicker.Loading className="frimousse-status">Loading…</EmojiPicker.Loading>
        <EmojiPicker.Empty className="frimousse-status">No emoji found.</EmojiPicker.Empty>
        <EmojiPicker.List />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
