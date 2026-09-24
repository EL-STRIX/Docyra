import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';
import reviewsApi from '../../services/reviews.api.js';
import RatingStars from '../../components/common/RatingStars.jsx';

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    try {
      const res = await reviewsApi.getMyReviews();
      if (res.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-border shadow-sm space-y-1">
        <span className="badge-primary text-[10px]">Patient Feedback</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-text-primary tracking-tight">
          My Doctor Reviews
        </h1>
        <p className="text-xs sm:text-sm text-neutral-text-secondary">
          Track and manage your submitted reviews. Reviews can be updated within 48 hours of initial publication.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-text-secondary">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading submitted reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-border p-12 text-center space-y-4">
          <MessageSquare className="w-12 h-12 text-neutral-text-secondary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-text-primary">No Reviews Yet</h3>
            <p className="text-xs text-neutral-text-secondary max-w-sm mx-auto">
              Once you complete an appointment with a specialist, you will be able to share your verified review.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rev) => {
            const docUser = rev.doctorId?.userId || {};
            const spec = rev.doctorId?.specializationId || {};
            const isEditable = rev.editableUntil && new Date(rev.editableUntil) > new Date();

            return (
              <div
                key={rev._id}
                className="card-docyra p-6 flex flex-col justify-between space-y-5 bg-white"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        rev.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {rev.status === 'published' ? 'Published' : 'Moderation Review'}
                    </span>
                    <span className="text-[10px] text-neutral-text-secondary">
                      {rev.createdAt ? format(new Date(rev.createdAt), 'MMM dd, yyyy') : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center font-bold text-sm">
                      {docUser.name ? docUser.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-neutral-text-primary">{docUser.name || 'Doctor'}</h3>
                      <p className="text-xs font-semibold text-brand-primary">{spec.name || 'Specialist'}</p>
                    </div>
                  </div>

                  <RatingStars rating={rev.rating} size="sm" />

                  <p className="text-xs text-neutral-text-secondary leading-relaxed italic bg-neutral-bg p-3 rounded-xl border border-neutral-border">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-border text-[11px] text-neutral-text-secondary flex justify-between items-center">
                  <span>
                    {isEditable ? (
                      <span className="text-emerald-700 font-semibold">Editable until {format(new Date(rev.editableUntil), 'hh:mm a')}</span>
                    ) : (
                      <span>48-hour edit window closed</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
