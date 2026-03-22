export interface ImageSizes {
  full: string;
  og: string;
  thumbnail: string;
}

export interface FeaturedImage {
  url: string;
  alt?: string;
  crops?: {
    '16:9'?: ImageSizes | string; // Support both new nested and old flat structure
    '4:3'?: ImageSizes | string;
    '1:1'?: ImageSizes | string;
    '3:4'?: ImageSizes | string;
    '9:16'?: ImageSizes | string;
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
