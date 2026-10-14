import React, { useEffect, useRef, useState } from 'react';
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

const CATEGORIES = [
  [/smile|emotion/, 'Smileys', '<circle cx="12" cy="12" r="8"/><path d="M8.5 10.2h.01M15.5 10.2h.01M8.5 14c.8 1.3 2 2 3.5 2s2.7-.7 3.5-2"/>'],
  [/people|body/, 'People', '<circle cx="12" cy="8" r="3"/><path d="M6.5 19c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4"/>'],
  [/animal|nature/, 'Animals', '<circle cx="8" cy="8" r="2.2"/><circle cx="16" cy="8" r="2.2"/><circle cx="7" cy="15" r="1.6"/><circle cx="12" cy="17" r="1.6"/><circle cx="17" cy="15" r="1.6"/>'],
  [/food|drink/, 'Food', '<path d="M8 4v7M6 4v3a2 2 0 0 0 4 0V4M16 4v16M13 4h6"/>'],
  [/travel|place/, 'Travel', '<path d="M4 15h16l-1.5-4H6.5L4 15zM7 15v2M17 15v2M8 11l1.2-3h5.6L16 11"/>'],
  [/activ/, 'Activities', '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.2 7.2l11.6 9.6M17.8 7.2 6.2 16.8"/>'],
  [/object/, 'Objects', '<path d="M9 15a4.5 4.5 0 1 1 6 0c-.6.6-1 1.3-1 2.2V18H10v-.8c0-.9-.4-1.6-1-2.2zM10 20h4"/>'],
  [/symbol/, 'Symbols', '<path d="M10 5 8 19M16 5l-2 14M5 9h14M4 15h14"/>'],
  [/flag/, 'Flags', '<path d="M7 4v16M7 5h10l-2 3.5L17 12H7"/>']
];

function glyph(label) {
  const text = label.toLowerCase();
  return CATEGORIES.find(([pattern]) => pattern.test(text)) || CATEGORIES[0];
}

function headers(root) {
  return [...root.querySelectorAll('[frimousse-category-header]')].filter(header => !header.closest('[aria-hidden="true"]') && header.textContent.trim() && header.textContent.trim() !== 'Category');
}

function CategoryBar() {
  const bar = useRef(null);
  const [names, setNames] = useState([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = bar.current?.closest('[frimousse-root]');
    const viewport = root?.querySelector('[frimousse-viewport]');
    if (!root || !viewport) return;
    const read = () => headers(root).map(header => header.textContent.trim());
    const sync = () => {
      const next = read();
      setNames(current => current.length === next.length && current.every((name, index) => name === next[index]) ? current : next);
    };
    const mark = () => {
      const boxes = headers(root).map(header => header.closest('[frimousse-category]')).filter(Boolean);
      const top = viewport.scrollTop + 8;
      let index = 0;
      boxes.forEach((box, i) => { if (box.offsetTop <= top) index = i; });
      setActive(current => current === index ? current : index);
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    viewport.addEventListener('scroll', mark, { passive: true });
    sync();
    return () => { observer.disconnect(); viewport.removeEventListener('scroll', mark); };
  }, []);
  return (
    <div ref={bar} className="emoji-cats" role="tablist" aria-label="Emoji categories" hidden={!names.length}>
      {names.map((name, index) => {
        const [, label, shape] = glyph(name);
        return (
          <button
            key={name}
            type="button"
            role="tab"
            className={index === active ? 'on' : undefined}
            aria-label={label}
            aria-selected={index === active}
            onClick={event => {
              const root = event.currentTarget.closest('[frimousse-root]');
              const viewport = root?.querySelector('[frimousse-viewport]');
              const box = headers(root)[index]?.closest('[frimousse-category]');
              if (viewport && box) viewport.scrollTo({ top: box.offsetTop, behavior: 'smooth' });
              setActive(index);
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: shape }} />
          </button>
        );
      })}
    </div>
  );
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
      <CategoryBar />
    </EmojiPicker.Root>
  );
}
