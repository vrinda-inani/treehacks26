import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Toc from './Toc';

export default function PageWrapper({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(42 33% 97%)', color: 'hsl(220 15% 25%)' }}>
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-[1180px] px-6 pt-28 pb-16 flex flex-col gap-10 overflow-visible lg:grid lg:grid-cols-[220px_minmax(0,_1fr)] lg:items-start">
          <div className="hidden lg:block -ml-6 sticky top-5">
            <Toc />
          </div>
          <article className="lw-content max-w-3xl flex-1 prose prose-lg" style={{ '--tw-prose-headings': 'hsl(220 25% 12%)' }}>
            {children}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
