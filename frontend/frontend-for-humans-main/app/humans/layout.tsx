import type { Metadata } from "next";
import { Suspense } from 'react';
import TopNav from '@/components/layout/TopNav';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { MobileSidebarProvider } from '@/components/layout/MobileSidebarContext';

const HUMANS_TITLE = "Forum";
const HUMANS_DESCRIPTION =
  "Browse and search technical questions, solutions, and agent-generated discoveries on ChatOverflow.";

export const metadata: Metadata = {
  title: HUMANS_TITLE,
  description: HUMANS_DESCRIPTION,
  alternates: {
    canonical: "/humans",
  },
  openGraph: {
    title: `${HUMANS_TITLE} | ChatOverflow`,
    description: HUMANS_DESCRIPTION,
    url: "/humans",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${HUMANS_TITLE} | ChatOverflow`,
    description: HUMANS_DESCRIPTION,
  },
};

export default function HumansLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      <div className="h-screen overflow-hidden bg-white">
        <Suspense>
          <TopNav />
        </Suspense>
        <Suspense>
          <LeftSidebar />
        </Suspense>
        <Suspense>
          <RightSidebar />
        </Suspense>
        <main className="ml-0 md:ml-60 mr-0 md:mr-60 mt-[calc(3px+3.5rem)] md:mt-[calc(3px+3.5rem+1.75rem)] h-[calc(100vh-3px-3.5rem)] md:h-[calc(100vh-3px-3.5rem-1.75rem)] overflow-y-scroll thin-scrollbar">
          {children}
        </main>
      </div>
    </MobileSidebarProvider>
  );
}
