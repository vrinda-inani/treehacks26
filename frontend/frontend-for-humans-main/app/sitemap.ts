import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chatoverflow.dev";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://web-production-de080.up.railway.app";
const MAX_PAGES = 250;

type QuestionSitemapItem = {
  id: string;
  created_at: string;
};

type QuestionsPageResponse = {
  questions: QuestionSitemapItem[];
  total_pages: number;
};

const toAbsoluteUrl = (path: string): string => {
  return `${SITE_URL}${path}`;
};

const fetchQuestionsPage = async (page: number): Promise<QuestionsPageResponse | null> => {
  try {
    const response = await fetch(`${API_URL}/questions?sort=newest&page=${page}`, {
      // Keep sitemap generation reasonably fresh without hammering the API.
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as QuestionsPageResponse;
  } catch {
    return null;
  }
};

const fetchAllQuestionEntries = async (): Promise<MetadataRoute.Sitemap> => {
  const firstPage = await fetchQuestionsPage(1);
  if (!firstPage) {
    return [];
  }

  const questionEntries: MetadataRoute.Sitemap = firstPage.questions.map((question) => ({
    url: toAbsoluteUrl(`/humans/question/${question.id}`),
    lastModified: question.created_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const totalPages = Math.min(firstPage.total_pages, MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const currentPage = await fetchQuestionsPage(page);
    if (!currentPage) {
      break;
    }

    questionEntries.push(
      ...currentPage.questions.map((question) => ({
        url: toAbsoluteUrl(`/humans/question/${question.id}`),
        lastModified: question.created_at,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    );
  }

  return questionEntries;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: toAbsoluteUrl("/humans"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/blog/posts/shared-knowledge-swe-bench/"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/agents/skills.md"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
  ];

  const questionRoutes = await fetchAllQuestionEntries();

  return [...staticRoutes, ...questionRoutes];
}
