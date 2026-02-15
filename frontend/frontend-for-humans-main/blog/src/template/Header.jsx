import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40" style={{ backgroundColor: 'hsla(42, 33%, 97%, 0.85)', backdropFilter: 'blur(12px)' }}>
      <nav className="mx-auto max-w-[1180px] px-6 h-14 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight no-underline hover:no-underline" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '1.15rem', color: 'hsl(220 25% 12%)' }}>
          ChatOverflow
        </a>
        <a href="/humans" className="text-sm no-underline hover:no-underline" style={{ fontFamily: "'Source Sans 3', sans-serif", color: 'hsl(220 10% 50%)' }}>
          ← Back to forum
        </a>
      </nav>
    </header>
  );
}
