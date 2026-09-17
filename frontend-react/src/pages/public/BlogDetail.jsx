import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, Share2, BookOpen } from 'lucide-react';
import { BLOG_POSTS } from './Blog';
import Badge from '../../components/common/Badge';

export const BlogDetail = () => {
  const { id } = useParams();
  const post = BLOG_POSTS.find(p => p.id === id) || BLOG_POSTS[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <Link to="/blog" className="inline-flex items-center text-sm font-semibold text-docyra-text-secondary hover:text-docyra-primary space-x-1.5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Articles</span>
      </Link>

      <article className="card-docyra p-8 sm:p-12 space-y-8">
        <div className="space-y-4 border-b border-stone-100 pb-6">
          <Badge variant="primary">{post.category}</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-docyra-text-primary leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-2">
            <span className="flex items-center gap-1 font-semibold text-docyra-text-primary">
              <User className="w-3.5 h-3.5 text-docyra-primary" /> {post.author}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {post.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {post.readTime}
            </span>
          </div>
        </div>

        <div className="prose prose-stone max-w-none text-sm text-docyra-text-secondary leading-relaxed space-y-6 whitespace-pre-line">
          {post.content}
        </div>

        <div className="border-t border-stone-100 pt-6 flex items-center justify-between">
          <p className="text-xs text-stone-400">Medically reviewed for clinical accuracy by Docyra Editorial Board.</p>
          <Link to="/doctors" className="btn-accent text-xs py-2 px-4 shadow-sm">
            Book a Specialist Consultation
          </Link>
        </div>
      </article>
    </div>
  );
};

export default BlogDetail;
