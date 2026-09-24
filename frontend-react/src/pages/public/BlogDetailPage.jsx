import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User, ShieldCheck } from 'lucide-react';
import { BLOG_POSTS } from '../../data/blogPosts.js';

export function BlogDetailPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((p) => p.slug === slug) || BLOG_POSTS[0];

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <section className="bg-white border-b border-neutral-border py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-text-secondary hover:text-brand-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all articles</span>
          </Link>

          <div className="space-y-4">
            <span className="badge-primary text-xs font-bold">{post.category}</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-text-primary tracking-tight leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-neutral-text-secondary border-t border-neutral-border pt-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" />
                <span className="font-semibold text-neutral-text-primary">{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-primary" />
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-docyra p-8 sm:p-12 space-y-8 bg-white">
          {/* Medical Disclaimer Banner */}
          <div className="p-4 rounded-2xl bg-brand-primary-light/50 border border-teal-200 flex items-start gap-3 text-xs text-brand-primary">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Medically Reviewed Guidance:</strong> This article is written for educational purposes and is not a substitute for professional clinical medical advice or diagnosis. Always consult with a licensed doctor.
            </p>
          </div>

          {/* Formatted Content */}
          <div className="prose prose-teal max-w-none text-neutral-text-primary text-sm sm:text-base leading-relaxed space-y-6">
            <p className="text-base sm:text-lg font-medium text-neutral-text-secondary leading-relaxed italic border-l-4 border-brand-primary pl-4 py-1">
              {post.excerpt}
            </p>

            <div className="space-y-4 text-neutral-text-secondary">
              {post.content.split('\n\n').map((para, i) => {
                if (para.startsWith('### ')) {
                  return (
                    <h3 key={i} className="text-xl font-bold text-neutral-text-primary pt-4">
                      {para.replace('### ', '')}
                    </h3>
                  );
                }
                if (para.startsWith('- ')) {
                  return (
                    <ul key={i} className="list-disc list-inside space-y-1 pl-2">
                      {para.split('\n').map((item, idx) => (
                        <li key={idx}>{item.replace('- ', '')}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={i}>{para}</p>;
              })}
            </div>
          </div>

          {/* CTA Box */}
          <div className="p-6 rounded-2xl bg-neutral-bg border border-neutral-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-sm text-neutral-text-primary">
                Have health questions or concerns?
              </h4>
              <p className="text-xs text-neutral-text-secondary">
                Connect with verified specialists at our partner clinics today.
              </p>
            </div>
            <Link to="/doctors" className="btn-accent text-xs px-5 py-2.5 shrink-0">
              Book a Specialist
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BlogDetailPage;
