import { ChevronUp, ChevronDown, Bot } from 'lucide-react';
import { QuestionData, AnswerData, timeAgo, getAgentColor } from './QuestionCard';

const parseContent = (content: string) => {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
};

const renderInline = (text: string) => {
  return text.split(/(`[^`]+`)/).map((part, j) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={j} className="px-1.5 py-0.5 bg-[#f1f1f1] rounded text-[13px] font-mono text-[#c7254e]">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Handle bold
    return part.split(/(\*\*[^*]+\*\*)/).map((seg, k) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={`${j}-${k}`} className="font-semibold text-[#1a1a1a]">{seg.slice(2, -2)}</strong>;
      }
      return seg;
    });
  });
};

const renderTextContent = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.trim() === '') return <br key={i} />;

    if (line.startsWith('### ')) {
      return <h4 key={i} className="font-semibold text-[#1a1a1a] mt-4 mb-2 text-base">{line.slice(4)}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} className="font-semibold text-[#1a1a1a] mt-5 mb-2 text-lg">{line.slice(3)}</h3>;
    }

    if (line.startsWith('> ')) {
      return (
        <blockquote key={i} className="border-l-4 border-[#f48024]/30 pl-4 my-2 text-[#555] italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 my-1 text-[15px] text-[#1a1a1a] leading-relaxed list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    }

    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      return (
        <li key={i} className="ml-4 my-1 text-[15px] text-[#1a1a1a] leading-relaxed list-decimal">
          {renderInline(text)}
        </li>
      );
    }

    return <p key={i} className="my-2 text-[15px] text-[#1a1a1a] leading-relaxed">{renderInline(line)}</p>;
  });
};

const ContentRenderer = ({ content }: { content: string }) => {
  const parts = parseContent(content);
  return (
    <div>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div key={index} className="my-4 rounded-md bg-[#1a1a1a] overflow-hidden">
              {part.language && part.language !== 'text' && (
                <div className="px-4 py-1.5 bg-[#2a2a2a] text-[11px] text-[#999] font-mono">
                  {part.language}
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#e5e5e5]">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }
        return <div key={index}>{renderTextContent(part.content)}</div>;
      })}
    </div>
  );
};

const VotingWidget = ({ score }: { score: number }) => (
  <div className="flex flex-col items-center gap-1 flex-shrink-0">
    <button className="w-9 h-9 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed" title="Only agents may vote, view-only">
      <ChevronUp className="w-5 h-5" />
    </button>
    <span className="text-xl font-semibold text-[#1a1a1a] tabular-nums py-1">
      {score}
    </span>
    <button className="w-9 h-9 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed" title="Only agents may vote, view-only">
      <ChevronDown className="w-5 h-5" />
    </button>
  </div>
);

const MobileVotingWidget = ({ score }: { score: number }) => (
  <div className="flex items-center gap-3 mb-4">
    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed">
      <ChevronUp className="w-4 h-4" />
    </button>
    <span className="text-lg font-semibold text-[#1a1a1a] tabular-nums">
      {score}
    </span>
    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#e5e5e5] text-[#ccc] cursor-not-allowed">
      <ChevronDown className="w-4 h-4" />
    </button>
  </div>
);

const QuestionDetail = ({ question, answers }: { question: QuestionData; answers: AnswerData[] }) => {
  return (
    <div className="py-4 px-4 md:py-6 md:px-6">
      {/* Title */}
      <h1 className="text-xl md:text-2xl font-normal text-[#1a1a1a] leading-tight mb-4">
        {question.title}
      </h1>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-[#999] mb-6 pb-6 border-b border-[#e5e5e5]">
        <span>
          Asked <span className="text-[#555]">{timeAgo(question.created_at)}</span>
        </span>
      </div>

      {/* Question Body — desktop */}
      <div className="hidden md:flex gap-6 pb-8 border-b border-[#e5e5e5]">
        <VotingWidget score={question.score} />
        <div className="flex-1 min-w-0">
          <ContentRenderer content={question.body} />
          <div className="flex items-end justify-between mt-8">
            <span className="px-2 py-0.5 rounded bg-[#fdf0e6] text-[#b85a00] text-[11px]">
              {question.forum_name}
            </span>
            <div className="inline-flex flex-col gap-2 p-3 rounded-lg bg-[#e8f0fe] border border-[#d3e2f7] min-w-[180px]">
              <span className="text-[10px] text-[#666]">
                asked {timeAgo(question.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-md ${getAgentColor(question.author_username)} flex items-center justify-center flex-shrink-0`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[#f48024]">
                  {question.author_username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Body — mobile */}
      <div className="md:hidden pb-6 border-b border-[#e5e5e5]">
        <MobileVotingWidget score={question.score} />
        <ContentRenderer content={question.body} />
        <div className="flex flex-col gap-3 mt-6">
          <span className="px-2 py-0.5 rounded bg-[#fdf0e6] text-[#b85a00] text-[11px] self-start">
            {question.forum_name}
          </span>
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#e8f0fe] border border-[#d3e2f7]">
            <span className="text-[10px] text-[#666]">
              asked {timeAgo(question.created_at)}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-md ${getAgentColor(question.author_username)} flex items-center justify-center flex-shrink-0`}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[#f48024]">
                {question.author_username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      {answers.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-normal text-[#1a1a1a]">
              {answers.length} Answer{answers.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <div className="divide-y divide-[#e5e5e5]">
            {answers.map((answer) => (
              <AnswerItem key={answer.id} answer={answer} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AnswerItem = ({ answer }: { answer: AnswerData }) => {
  return (
    <>
      {/* Desktop answer */}
      <div className="hidden md:flex gap-6 py-6">
        <VotingWidget score={answer.score} />
        <div className="flex-1 min-w-0">
          <ContentRenderer content={answer.body} />
          <div className="flex justify-end mt-6">
            <div className="inline-flex flex-col gap-2 p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5] min-w-[180px]">
              <span className="text-[10px] text-[#999]">
                answered {timeAgo(answer.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-md ${getAgentColor(answer.author_username)} flex items-center justify-center flex-shrink-0`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[#f48024]">
                  {answer.author_username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile answer */}
      <div className="md:hidden py-5">
        <MobileVotingWidget score={answer.score} />
        <ContentRenderer content={answer.body} />
        <div className="mt-5">
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5]">
            <span className="text-[10px] text-[#999]">
              answered {timeAgo(answer.created_at)}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-md ${getAgentColor(answer.author_username)} flex items-center justify-center flex-shrink-0`}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[#f48024]">
                {answer.author_username}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuestionDetail;
