import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, User, ArrowRight, Search, Clock } from 'lucide-react';
import Badge from '../../components/common/Badge';

export const BLOG_POSTS = [
  {
    id: 'preventative-cardiology-guide',
    title: 'Modern Preventative Cardiology: 5 Essential Screenings for Adults',
    summary: 'Learn why early cardiovascular screenings and continuous blood pressure monitoring can prevent chronic heart events.',
    category: 'Heart Health',
    author: 'Dr. Sarah Connor, MD',
    date: 'September 15, 2026',
    readTime: '4 min read',
    content: `Cardiovascular health remains the single most impactful dimension of adult preventative medicine. Early diagnostics, lifestyle adaptations, and routine blood biomarker evaluations allow medical practitioners to identify hypertension and arterial stiffness years before clinical symptoms manifest.

## 1. Annual Lipid & ApoB Profiling
Traditional cholesterol checks provide only a high-level summary. Modern cardiologists evaluate Apolipoprotein B (ApoB) and high-sensitivity C-reactive protein (hs-CRP) for a more granular view of vascular inflammation.

## 2. Ambulatory Blood Pressure Checks
Single in-clinic readings often suffer from "white-coat syndrome." Multi-day ambulatory monitoring provides the true baseline needed for accurate diagnosis.

## 3. Calcium Scoring & Early Imaging
For patients with familial history, non-invasive coronary calcium CT scans establish exact arterial health metrics, guiding early intervention and personalized nutritional care.`
  },
  {
    id: 'pediatric-immunization-schedule',
    title: 'Understanding the Pediatric Immunization & Developmental Milestones',
    summary: 'A pediatrician-reviewed guide on childhood health checks, recommended schedules, and nutritional growth tracking.',
    category: 'Pediatrics',
    author: 'Dr. Gregory House, MD',
    date: 'September 10, 2026',
    readTime: '6 min read',
    content: `Early childhood health tracking establishes the foundation for lifelong physical and cognitive development. Routine pediatric consultations offer parents guidance on growth percentiles, sleep regulation, and sensory milestones.

## Developmental Milestones in the First 24 Months
Tracking speech acquisition, motor dexterity, and social engagement during standard 6-month wellness checkups ensures early detection of developmental anomalies.`
  },
  {
    id: 'skin-health-and-dermatology-myths',
    title: 'Debunking Common Skincare Myths: What Dermatologists Recommend',
    summary: 'Clinical dermatologists break down active ingredients, sun protection standards, and regular mole mapping.',
    category: 'Dermatology',
    author: 'Dr. Lisa Cuddy, MD',
    date: 'September 02, 2026',
    readTime: '5 min read',
    content: `With the explosion of beauty trends, separating evidence-based dermatology from commercial marketing is essential. Clinical dermatologists prioritize skin barrier integrity, broad-spectrum UV protection, and systematic skin cancer screenings.`
  }
];

export const Blog = () => {
  const [search, setSearch] = useState('');

  const filteredPosts = BLOG_POSTS.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="primary">Health & Wellness</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
          Docyra Health Articles & Insights
        </h1>
        <p className="text-lg text-docyra-text-secondary">
          Evidence-based articles written and reviewed by accredited medical practitioners.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search articles by topic or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-docyra-neutral-border text-xs focus:outline-none focus:ring-2 focus:ring-docyra-primary/20 bg-white"
        />
      </div>

      {/* Blog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredPosts.map((post) => (
          <div key={post.id} className="card-docyra p-6 sm:p-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-docyra-primary bg-docyra-primary-light px-2.5 py-1 rounded-full uppercase tracking-wider">
                {post.category}
              </span>
              <h2 className="text-xl font-bold text-docyra-text-primary leading-snug">
                {post.title}
              </h2>
              <p className="text-xs text-docyra-text-secondary leading-relaxed">
                {post.summary}
              </p>
            </div>

            <div className="space-y-4 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
              </div>
              <Link
                to={`/blog/${post.id}`}
                className="btn-primary w-full text-xs py-2 text-center flex items-center justify-center space-x-1"
              >
                <span>Read Article</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Blog;
