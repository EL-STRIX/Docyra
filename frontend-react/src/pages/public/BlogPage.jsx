import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, User } from 'lucide-react';
import { BLOG_POSTS } from '../../data/blogPosts.js';

export function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = ['All', 'Cardiology', 'Pediatrics', 'Healthcare Tech'];

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-16 pb-20">
      {/* Header */}
      <section className="pt-12 pb-14 hero-gradient border-b border-neutral-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="badge-primary uppercase tracking-wider text-[11px]">
            Health & Wellness Insights
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight">
            Docyra Health Articles
          </h1>
          <p className="text-base sm:text-lg text-neutral-text-secondary leading-relaxed max-w-2xl mx-auto">
            Evidence-based medical guidance, preventative care tips, and healthcare innovations written by certified practitioners.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-md mx-auto">
            <div className="relative">
              <Search className="w-5 h-5 text-neutral-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search health topics..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-neutral-border text-sm text-neutral-text-primary placeholder:text-neutral-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills & Article Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Categories */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-white border border-neutral-border text-neutral-text-secondary hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="card-docyra p-7 flex flex-col justify-between space-y-6 hover:-translate-y-1 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="badge-primary text-[10px]">{post.category}</span>
                  <span className="text-neutral-text-secondary">{post.readTime}</span>
                </div>

                <h3 className="text-xl font-bold text-neutral-text-primary hover:text-brand-primary transition-colors">
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>

                <p className="text-xs text-neutral-text-secondary leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-text-secondary">
                  <User className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{post.author}</span>
                </div>
                <Link
                  to={`/blog/${post.slug}`}
                  className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default BlogPage;
