export interface FeaturedImage {
  url: string;
  alt?: string;
}

export interface AuthorInfo {
  name?: string;
  avatarUrl?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  featuredImage?: FeaturedImage;
  categories?: string[];
  author?: AuthorInfo;
  urlStub: string;
  createdAt?: any;
  updatedAt?: any;
  status?: string; // draft | published
}
