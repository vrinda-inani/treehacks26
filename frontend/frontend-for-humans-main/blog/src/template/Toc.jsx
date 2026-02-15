import React, { useEffect, useState } from 'react';

export default function Toc({ targetSelector = '.lw-content' }) {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState(null);
  const [totalMinutes, setTotalMinutes] = useState(null);

  useEffect(() => {
    const container = document.querySelector(targetSelector);
    if (!container) return;

    const words = (container.textContent || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const computedMinutes = words ? words / 220 : null;
    setTotalMinutes(computedMinutes);

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      setProgress(ratio);
      if (computedMinutes != null) {
        setMinutesLeft(Math.max(0, computedMinutes * (1 - ratio)));
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [targetSelector]);

  useEffect(() => {
    const container = document.querySelector(targetSelector);
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h2, h3'));
    const mapped = headings.map((el) => ({
      id: el.id,
      text: (el.textContent?.trim() || '').replace(/^#\s*/, ''),
      level: Number(el.tagName.slice(1)),
    }));
    setItems(mapped);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [targetSelector]);

  return (
    <aside className="w-[210px] lw-toc pr-4">
      <div className="relative pl-6" style={{ color: 'hsl(220 10% 50%)' }}>
        <div className="absolute left-1 top-0 bottom-0 w-px" style={{ backgroundColor: 'hsl(42 20% 88%)' }} />
        <div className="flex items-center gap-2 mb-3 uppercase tracking-[0.18em]" style={{ fontSize: '0.68rem', color: 'hsl(220 25% 12%)' }}>
          <span>Contents</span>
        </div>
        {minutesLeft != null && (
          <div className="mb-3" style={{ fontSize: '0.78rem', color: 'hsl(220 10% 50%)' }}>
            <div className="font-semibold" style={{ color: 'hsl(220 25% 12%)' }}>{Math.round(progress * 100)}% read</div>
            <div>~{Math.max(0, Math.ceil(minutesLeft))} min left</div>
          </div>
        )}
        <nav className="space-y-2">
          {(items.length ? items : [{ id: 'loading', text: 'Loading…', level: 2 }]).map((item, idx) => {
            const isActive = item.id === activeId;
            const isPlaceholder = item.id === 'loading';
            return (
              <a
                key={`${item.id}-${idx}`}
                href={isPlaceholder ? undefined : `#${item.id}`}
                className={`group relative block pl-4 transition-colors ${
                  item.level === 3 ? 'ml-3' : ''
                } ${isPlaceholder ? 'pointer-events-none' : ''}`}
                style={{
                  color: isActive ? 'hsl(220 25% 12%)' : undefined,
                  fontWeight: isActive ? 600 : undefined,
                }}
              >
                <span
                  className="absolute top-1 h-2 w-2 rounded-full transition-transform"
                  style={{
                    left: '-0.75rem',
                    border: `1px solid ${isActive ? 'hsl(152 45% 35%)' : 'hsl(42 20% 88%)'}`,
                    backgroundColor: isActive ? 'hsl(152 45% 35%)' : 'hsl(42 33% 97%)',
                    transform: isActive ? 'scale(1.1)' : undefined,
                  }}
                />
                {item.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
