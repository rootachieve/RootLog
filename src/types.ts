export type PostMeta = {
  id: number;
  title: string;
  publishedAt: string;
  summary: string;
  description: string;
  thumbnail: string | null;
  tags: string[];
  category: string;
  keywords: string[];
  fileName: string;
};

export type Relation = {
  from: number;
  to: number;
  relation: string;
  weight: number;
};
