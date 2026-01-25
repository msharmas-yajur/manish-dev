/**
 * WordPress REST API Client
 * Fetches content from headless WordPress
 */

const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL || 'http://localhost:8082/wp-json';

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  featured_media: number;
  categories: number[];
  tags: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    author?: Array<{
      name: string;
      avatar_urls: Record<string, string>;
    }>;
  };
}

export interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  featured_media: number;
  parent: number;
  menu_order: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
  };
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  caption: { rendered: string };
  media_details: {
    width: number;
    height: number;
    sizes: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

// Fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${WORDPRESS_API_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
    ...options,
  });

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Posts
export async function getPosts(options: {
  perPage?: number;
  page?: number;
  category?: number;
  search?: string;
  orderBy?: 'date' | 'title' | 'modified';
  order?: 'asc' | 'desc';
} = {}): Promise<WPPost[]> {
  const params = new URLSearchParams({
    per_page: String(options.perPage || 10),
    page: String(options.page || 1),
    orderby: options.orderBy || 'date',
    order: options.order || 'desc',
    _embed: 'true',
  });

  if (options.category) params.set('categories', String(options.category));
  if (options.search) params.set('search', options.search);

  return fetchAPI<WPPost[]>(`/wp/v2/posts?${params}`);
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const posts = await fetchAPI<WPPost[]>(`/wp/v2/posts?slug=${slug}&_embed=true`);
  return posts[0] || null;
}

export async function getPostById(id: number): Promise<WPPost> {
  return fetchAPI<WPPost>(`/wp/v2/posts/${id}?_embed=true`);
}

// Pages
export async function getPages(): Promise<WPPage[]> {
  return fetchAPI<WPPage[]>('/wp/v2/pages?per_page=100&_embed=true');
}

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const pages = await fetchAPI<WPPage[]>(`/wp/v2/pages?slug=${slug}&_embed=true`);
  return pages[0] || null;
}

export async function getPageById(id: number): Promise<WPPage> {
  return fetchAPI<WPPage>(`/wp/v2/pages/${id}?_embed=true`);
}

// Media
export async function getMedia(id: number): Promise<WPMedia> {
  return fetchAPI<WPMedia>(`/wp/v2/media/${id}`);
}

// Categories
export async function getCategories(): Promise<WPCategory[]> {
  return fetchAPI<WPCategory[]>('/wp/v2/categories?per_page=100');
}

export async function getCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const categories = await fetchAPI<WPCategory[]>(`/wp/v2/categories?slug=${slug}`);
  return categories[0] || null;
}

// Site info
export async function getSiteInfo(): Promise<{
  name: string;
  description: string;
  url: string;
}> {
  return fetchAPI('/');
}

// Featured image helper
export function getFeaturedImageUrl(post: WPPost | WPPage): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  return media?.source_url || null;
}

// Author helper
export function getAuthor(post: WPPost): { name: string; avatar: string } | null {
  const author = post._embedded?.author?.[0];
  if (!author) return null;
  return {
    name: author.name,
    avatar: author.avatar_urls?.['96'] || '',
  };
}

// Strip HTML tags
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
