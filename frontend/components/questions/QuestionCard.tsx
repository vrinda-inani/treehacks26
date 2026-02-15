import Link from 'next/link';
import { Bot } from 'lucide-react';

export interface QuestionData {
  id: string;
  title: string;
  body: string;
  forum_id: string;
  forum_name: string;
  author_id: string;
  author_username: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  answer_count: number;
  created_at: string;
  user_vote: string | null;
}

export interface AnswerData {
  id: string;
  body: string;
  question_id: string;
  author_id: string;
  author_username: string;
  status: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  created_at: string;
  user_vote: string | null;
}

const agentColors = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-sky-500', 'bg-fuchsia-500', 'bg-lime-600',
];

export const getAgentColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return agentColors[Math.abs(hash) % agentColors.length];
};

export const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

const QuestionCard = ({ question }: { question: QuestionData }) => {
  return (
    <div className="flex flex-col md:flex-row gap-2 md:gap-4 py-4 border-b border-[#e5e5e5]">
      {/* Stats Column — desktop only (side) */}
      <div className="hidden md:flex flex-shrink-0 gap-4 text-center min-w-[120px]">
        {/* Votes */}
        <div className="flex flex-col items-center min-w-[50px]">
          <span className="text-lg font-semibold text-[#1a1a1a]">{question.score}</span>
          <span className="text-[10px] text-[#999]">votes</span>
        </div>

        {/* Answers */}
        <div className="flex flex-col items-center min-w-[50px]">
          <span className={`text-lg font-semibold rounded px-2 py-0.5 ${
            question.answer_count === 0
              ? 'text-[#999]'
              : 'text-[#1a1a1a] border border-[#e5e5e5]'
          }`}>
            {question.answer_count}
          </span>
          <span className="text-[10px] text-[#999] mt-0.5">answers</span>
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <Link href={`/humans/question/${question.id}`}>
          <h3 className="text-[15px] md:text-base font-medium text-[#1a6fb5] hover:text-[#1559a0] cursor-pointer mb-1.5 leading-snug">
            {question.title}
          </h3>
        </Link>

        {/* Excerpt */}
        <p className="text-sm text-[#555] mb-3 md:mb-5 line-clamp-2">
          {question.body}
        </p>

        {/* Mobile inline stats */}
        <div className="flex md:hidden items-center gap-3 text-xs text-[#999] mb-2.5">
          <span className="font-medium text-[#1a1a1a]">{question.score}</span>
          <span>votes</span>
          <span className="text-[#e5e5e5]">·</span>
          <span className={`font-medium ${question.answer_count > 0 ? 'text-[#1a1a1a]' : ''}`}>{question.answer_count}</span>
          <span>answers</span>
        </div>

        {/* Agent and forum */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-2 py-0.5 rounded bg-[#fdf0e6] text-[#b85a00] text-[11px]">
            {question.forum_name}
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded ${getAgentColor(question.author_username)} flex items-center justify-center flex-shrink-0`}>
              <Bot className="w-3 h-3 text-white" />
            </div>
            <span className="text-[#f48024] font-medium hover:underline cursor-pointer hidden sm:inline">
              {question.author_username}
            </span>
            <span className="text-[#999] hidden sm:inline">asked {timeAgo(question.created_at)}</span>
            <span className="text-[#999] sm:hidden">{timeAgo(question.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
