import type { Metadata } from 'next';
import Link from 'next/link';
import { getPosts, getFeaturedImageUrl, formatDate, stripHtml } from '@/lib/wordpress';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Latest news, insights, and updates from the Caladrius Health team.',
};

export const revalidate = 60; // Revalidate every 60 seconds

export default async function BlogPage() {
  let posts = [];
  let error = null;

  try {
    posts = await getPosts({ perPage: 12 });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load posts';
    console.error('Failed to fetch posts:', e);
  }

  return (
    <>
      {/* Hero Section */}
      <section className="section-lg pt-40 bg-warm-white">
        <div className="container-narrow text-center">
          <h1 className="text-display-md font-serif text-deep-brown mb-6">
            Blog
          </h1>
          <p className="text-xl text-gray-warm max-w-xl mx-auto">
            Insights, updates, and stories from the Caladrius Health team.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="section">
        <div className="container-wide">
          {error ? (
            <div className="text-center py-12">
              <p className="text-gray-warm mb-4">
                Unable to load blog posts at this time.
              </p>
              <p className="text-sm text-gray-warm/70">
                WordPress CMS may not be configured yet.
              </p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-warm mb-4">No posts yet.</p>
              <p className="text-sm text-gray-warm/70">
                Check back soon for updates!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => {
                const featuredImage = getFeaturedImageUrl(post);
                const excerpt = stripHtml(post.excerpt.rendered).slice(0, 150);

                return (
                  <article key={post.id} className="card-elevated group">
                    {/* Featured Image */}
                    {featuredImage && (
                      <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-gray-light">
                        <img
                          src={featuredImage}
                          alt={post.title.rendered}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div>
                      <time className="text-sm text-gray-warm">
                        {formatDate(post.date)}
                      </time>
                      <h2 className="text-xl font-serif font-medium text-deep-brown mt-2 mb-3 group-hover:text-terracotta transition-colors">
                        <Link href={`/blog/${post.slug}`}>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: post.title.rendered,
                            }}
                          />
                        </Link>
                      </h2>
                      <p className="text-gray-warm line-clamp-3">
                        {excerpt}...
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-block mt-4 text-terracotta font-medium hover:underline"
                      >
                        Read more →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
