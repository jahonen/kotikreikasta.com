export interface FeaturedImage {
  url: string;
  alt?: string;
  crops?: {
    '16:9'?: string;
    '4:3'?: string;
    '1:1'?: string;
    '3:4'?: string;
    '9:16'?: string;
  };
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
