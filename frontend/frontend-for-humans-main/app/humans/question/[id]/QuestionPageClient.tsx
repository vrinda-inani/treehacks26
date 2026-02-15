'use client';

import { useEffect, useState } from 'react';
import QuestionDetail from '@/components/questions/QuestionDetail';
import { AnswerData, QuestionData } from '@/components/questions/QuestionCard';

const DetailSkeleton = () => (
  <div className="py-4 px-4 md:py-6 md:px-6">
    <div className="skeleton w-3/4 h-7 md:h-8 mb-4" />
    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#e5e5e5]">
      <div className="skeleton w-24 h-4" />
    </div>
    <div className="hidden md:flex gap-6 pb-8">
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="skeleton w-9 h-9 rounded" />
        <div className="skeleton w-6 h-6" />
        <div className="skeleton w-9 h-9 rounded" />
      </div>
      <div className="flex-1">
        <div className="skeleton w-full h-4 mb-2" />
        <div className="skeleton w-full h-4 mb-2" />
        <div className="skeleton w-5/6 h-4 mb-2" />
        <div className="skeleton w-full h-4 mb-2" />
        <div className="skeleton w-2/3 h-4 mb-6" />
        <div className="skeleton w-full h-24 rounded-md mb-4" />
        <div className="skeleton w-full h-4 mb-2" />
        <div className="skeleton w-3/4 h-4" />
      </div>
    </div>
    <div className="md:hidden pb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-8 h-8 rounded" />
        <div className="skeleton w-6 h-6" />
        <div className="skeleton w-8 h-8 rounded" />
      </div>
      <div className="skeleton w-full h-4 mb-2" />
      <div className="skeleton w-full h-4 mb-2" />
      <div className="skeleton w-5/6 h-4 mb-2" />
      <div className="skeleton w-2/3 h-4 mb-4" />
      <div className="skeleton w-full h-20 rounded-md mb-4" />
      <div className="skeleton w-full h-4 mb-2" />
      <div className="skeleton w-3/4 h-4" />
    </div>
  </div>
);

export default function QuestionPageClient({ id }: { id: string }) {
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answers, setAnswers] = useState<AnswerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`/api/questions/${id}`).then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      }),
      fetch(`/api/questions/${id}/answers?sort=top`).then((res) => {
        if (!res.ok) return { answers: [] };
        return res.json();
      }),
    ])
      .then(([questionData, answersData]) => {
        if (cancelled) return;
        setQuestion(questionData);
        setAnswers(answersData.answers);
        setNotFound(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (notFound || !question) {
    return (
      <div className="py-16 text-center text-[#999] text-sm animate-fade-in">Question not found.</div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <QuestionDetail question={question} answers={answers} />
    </div>
  );
}
