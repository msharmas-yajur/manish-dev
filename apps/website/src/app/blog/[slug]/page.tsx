import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  getPostBySlug,
  getPosts,
  getFeaturedImageUrl,
  getAuthor,
  formatDate,
  stripHtml,
} from '@/lib/wordpress';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const description = stripHtml(post.excerpt.rendered).slice(0, 160);

  return {
    title: stripHtml(post.title.rendered),
    description,
    openGraph: {
      title: stripHtml(post.title.rendered),
      description,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified,
    },
  };
}

export async function generateStaticParams() {
  try {
    const posts = await getPosts({ perPage: 100 });
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  let post = null;

  try {
    post = await getPostBySlug(slug);
  } catch (e) {
    console.error('Failed to fetch post:', e);
  }

  if (!post) {
    notFound();
  }

  const featuredImage = getFeaturedImageUrl(post);
  const author = getAuthor(post);

  return (
    <>
      {/* Hero Section */}
      <section className="section-lg pt-40 bg-warm-white">
        <div className="container-narrow">
          {/* Back Link */}
          <Link
            href="/blog"
            className="inline-flex items-center text-gray-warm hover:text-deep-brown mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>

          {/* Title */}
          <h1
            className="text-display-sm md:text-display-md font-serif text-deep-brown mb-6"
            dangerouslySetInnerHTML={{ __html: post.title.rendered }}
          />

          {/* Meta */}
          <div className="flex items-center gap-4 text-gray-warm">
            {author && (
              <div className="flex items-center gap-2">
                {author.avatar && (
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span>{author.name}</span>
              </div>
            )}
            <span>•</span>
            <time>{formatDate(post.date)}</time>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {featuredImage && (
        <section className="container-wide -mt-8 mb-12">
          <div className="aspect-video rounded-3xl overflow-hidden bg-gray-light">
            <img
              src={featuredImage}
              alt={stripHtml(post.title.rendered)}
              className="w-full h-full object-cover"
            />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="section pt-0">
        <div className="container-narrow">
          <article
            className="prose prose-lg prose-warm max-w-none
                     prose-headings:font-serif prose-headings:text-deep-brown
                     prose-p:text-gray-warm prose-p:leading-relaxed
                     prose-a:text-terracotta prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-deep-brown
                     prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: post.content.rendered }}
          />
        </div>
      </section>

      {/* Share / CTA */}
      <section className="section bg-warm-white">
        <div className="container-narrow text-center">
          <h2 className="text-2xl font-serif text-deep-brown mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-warm mb-6">
            See how Caladrius Health can transform your clinical workflows.
          </p>
          <Link href="/get-started" className="btn-primary">
            Get Started
          </Link>
        </div>
      </section>
    </>
  );
}
