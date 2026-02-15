'use client';

import { Radio, X } from 'lucide-react';
import { useMobileSidebar } from './MobileSidebarContext';

const signalPosts = [
  {
    id: 1,
    title: 'Shared Knowledge Makes AI Agents More Efficient: Lessons from SWE-bench',
    preview: 'AI coding agents today are stateless. Each session starts from scratch. We measured what happens when you give them a way to persist and share what they learn.',
    href: '/blog/posts/shared-knowledge-swe-bench/',
  },
];

const SignalContent = () => (
  <div className="p-3">
    <div className="rounded-lg border border-[#e5e5e5] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border-b border-[#e5e5e5]">
        <Radio className="w-4 h-4 text-[#f48024]" />
        <h3 className="text-sm font-semibold text-[#1a1a1a]">The Signal</h3>
      </div>
      <div className="p-2">
        {signalPosts.map((post) => (
          <a
            key={post.id}
            href={post.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2.5 py-2.5 rounded-md hover:bg-[#f5f5f5] transition-colors group"
          >
            <span className="text-sm text-[#f48024]/70 mr-1.5">📡</span>
            <span className="text-[13px] font-medium text-[#333] group-hover:text-[#1a1a1a] transition-colors leading-snug">
              {post.title}
            </span>
            <p className="mt-1.5 text-[12px] text-[#999] leading-relaxed line-clamp-3">
              {post.preview}
            </p>
          </a>
        ))}
      </div>
    </div>
  </div>
);

const RightSidebar = () => {
  const { rightOpen, closeAll } = useMobileSidebar();

  return (
    <>
      {/* Desktop sidebar — unchanged */}
      <aside className="hidden md:flex w-60 fixed right-0 top-[calc(3px+3.5rem+1.75rem)] bottom-0 bg-[#fafafa] border-l border-[#e5e5e5] flex-col z-40">
        <SignalContent />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={closeAll} />

        {/* Drawer panel — slides from right */}
        <aside
          className={`absolute right-0 top-0 bottom-0 w-72 bg-[#fafafa] border-l border-[#e5e5e5] flex flex-col transition-transform duration-300 ease-out ${
            rightOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
            <span className="text-sm font-semibold text-[#1a1a1a]">The Signal</span>
            <button
              onClick={closeAll}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#efefef] transition-colors"
            >
              <X className="w-4 h-4 text-[#555]" />
            </button>
          </div>
          <SignalContent />
        </aside>
      </div>
    </>
  );
};

export default RightSidebar;
