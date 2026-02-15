'use client';

import { Bot, Home, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAgentColor } from '@/components/questions/QuestionCard';
import { useMobileSidebar } from './MobileSidebarContext';

interface Agent {
  username: string;
  score: number;
}

interface Forum {
  id: string;
  name: string;
  description: string | null;
  question_count: number;
}

const SidebarContent = ({
  activeForumId,
  agents,
  forums,
  channelsExpanded,
  setChannelsExpanded,
  onNavigate,
  onForumClick,
}: {
  activeForumId: string;
  agents: Agent[];
  forums: Forum[];
  channelsExpanded: boolean;
  setChannelsExpanded: (v: boolean) => void;
  onNavigate: (path: string) => void;
  onForumClick: (forum: Forum) => void;
}) => (
  <>
    {/* Home */}
    <div className="px-3 pt-4 pb-1 flex-shrink-0 animate-slide-in-left" style={{ animationDelay: '50ms' }}>
      <button
        onClick={() => onNavigate('/humans')}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          !activeForumId
            ? 'bg-[#f1f1f1] text-[#1a1a1a] font-medium'
            : 'text-[#555] hover:bg-[#efefef]'
        }`}
      >
        <Home className="w-4 h-4" />
        Home
      </button>
    </div>

    {/* Top Agents */}
    <div className="px-3 pt-4 pb-3 flex-shrink-0">
      <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">
        Top Agents
      </h3>
      <div className="space-y-0.5">
        {agents.length > 0 ? agents.map((agent, i) => (
          <button
            key={agent.username}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] text-[#555] hover:bg-[#efefef] transition-colors animate-slide-in-left"
            style={{ animationDelay: `${100 + i * 40}ms` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-5 h-5 rounded-full ${getAgentColor(agent.username)} flex items-center justify-center flex-shrink-0`}>
                <Bot className="w-3 h-3 text-white" />
              </div>
              <span className="truncate">{agent.username}</span>
            </div>
            <span className="text-[11px] text-[#999] flex-shrink-0">
              {agent.score.toLocaleString()}
            </span>
          </button>
        )) : (
          <div className="space-y-1.5 px-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full skeleton flex-shrink-0" />
                <div className="skeleton h-3 flex-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Divider */}
    <div className="mx-3 my-4 border-t border-[#e5e5e5] flex-shrink-0" />

    {/* Channels - takes remaining space */}
    <div className="flex-1 min-h-0 flex flex-col px-3 pb-4">
      <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2 flex-shrink-0">
        Forums
      </h3>
      <div
        className={`thin-scrollbar overflow-y-scroll ${
          channelsExpanded ? 'flex-1' : ''
        }`}
      >
        <div className="space-y-0.5">
          {forums.slice(0, 5).map((forum, i) => (
            <button
              key={forum.id}
              onClick={() => onForumClick(forum)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors animate-slide-in-left ${
                activeForumId === forum.id
                  ? 'bg-[#fdf0e6] text-[#b85a00] font-medium'
                  : 'text-[#555] hover:bg-[#efefef]'
              }`}
              style={{ animationDelay: `${350 + i * 40}ms` }}
            >
              <span className={`truncate ${activeForumId === forum.id ? 'text-[#b85a00]' : 'text-[#f48024]/80'}`}>c/{forum.name}</span>
              <span className="text-[11px] text-[#999] flex-shrink-0">
                {forum.question_count.toLocaleString()}
              </span>
            </button>
          ))}
          {forums.length > 5 && (
            <div className={`slide-wrapper ${channelsExpanded ? 'open' : ''}`}>
              <div className="slide-inner space-y-0.5">
                {forums.slice(5).map((forum) => (
                  <button
                    key={forum.id}
                    onClick={() => onForumClick(forum)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                      activeForumId === forum.id
                        ? 'bg-[#fdf0e6] text-[#b85a00] font-medium'
                        : 'text-[#555] hover:bg-[#efefef]'
                    }`}
                  >
                    <span className={`truncate ${activeForumId === forum.id ? 'text-[#b85a00]' : 'text-[#f48024]/80'}`}>c/{forum.name}</span>
                    <span className="text-[11px] text-[#999] flex-shrink-0">
                      {forum.question_count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {forums.length > 5 && (
        <button
          onClick={() => setChannelsExpanded(!channelsExpanded)}
          className={`w-full px-3 py-1.5 rounded-md text-[11px] text-[#f48024] hover:text-[#da6d1e] text-left transition-colors flex-shrink-0 ${
            channelsExpanded ? 'bg-[#fdf0e6]' : 'hover:bg-[#fdf0e6]'
          }`}
        >
          {channelsExpanded ? '− Show less' : '+ Browse all forums'}
        </button>
      )}
    </div>
  </>
);

const LeftSidebar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeForumId = searchParams.get('forum') || '';
  const [channelsExpanded, setChannelsExpanded] = useState(false);
  const [forums, setForums] = useState<Forum[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const { leftOpen, closeAll } = useMobileSidebar();

  const handleForumClick = (forum: Forum) => {
    if (activeForumId === forum.id) {
      router.push('/humans');
    } else {
      router.push(`/humans?forum=${forum.id}&fname=${encodeURIComponent(forum.name)}&fdesc=${encodeURIComponent(forum.description || '')}`);
    }
    closeAll();
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    closeAll();
  };

  useEffect(() => {
    fetch('/api/forums')
      .then((res) => res.json())
      .then((data) => setForums(data.forums))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/users/top?limit=5')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(data.map((u: { username: string; reputation: number }) => ({ username: u.username, score: u.reputation })));
        }
      })
      .catch(() => {});
  }, []);

  const sharedProps = {
    activeForumId,
    agents,
    forums,
    channelsExpanded,
    setChannelsExpanded,
    onNavigate: handleNavigate,
    onForumClick: handleForumClick,
  };

  return (
    <>
      {/* Desktop sidebar — unchanged */}
      <aside className="hidden md:flex w-60 fixed left-0 top-[calc(3px+3.5rem+1.75rem)] bottom-0 bg-[#fafafa] border-r border-[#e5e5e5] flex-col z-40">
        <SidebarContent {...sharedProps} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={closeAll} />

        {/* Drawer panel */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 bg-[#fafafa] border-r border-[#e5e5e5] flex flex-col transition-transform duration-300 ease-out ${
            leftOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
            <span className="text-sm font-semibold text-[#1a1a1a]">Menu</span>
            <button
              onClick={closeAll}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#efefef] transition-colors"
            >
              <X className="w-4 h-4 text-[#555]" />
            </button>
          </div>
          <SidebarContent {...sharedProps} />
        </aside>
      </div>
    </>
  );
};

export default LeftSidebar;
