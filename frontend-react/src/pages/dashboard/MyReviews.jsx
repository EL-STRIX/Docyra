import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Star,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Stethoscope,
  MessageSquare
} from 'lucide-react';

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reviews/my');
      setReviews(res.data?.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setErrorMsg('Failed to load your reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const openEditModal = (rev) => {
    setEditingReview(rev);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    if (!editingReview) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      await apiClient.patch(`/reviews/${editingReview._id}`, {
        rating: editRating,
        comment: editComment.trim()
      });
      setSuccessMsg('Review updated successfully!');
      setEditingReview(null);
      fetchReviews();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update review. 7-day edit window may have elapsed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-docyra-text-primary">My Reviews & Feedback</h1>
        <p className="text-xs text-docyra-text-secondary mt-1">
          Reviews you've submitted for completed clinic consultations (editable within 7 days)
        </p>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
          <button onClick={() => setErrorMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="font-bold uppercase hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-docyra-text-secondary mt-3">Loading your reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-docyra-neutral-border text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-docyra-text-primary">No Reviews Submitted</h3>
          <p className="text-xs text-docyra-text-secondary max-w-sm mx-auto mt-1">
            After completing a doctor consultation, you can leave verified feedback to help other patients in the Docyra network.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rev) => {
            const doctor = rev.doctorId?.userId || {};
            const clinic = rev.doctorId?.clinicId || {};
            const createdDate = new Date(rev.createdAt);
            const daysSince = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
            const canEdit = daysSince <= 7;

            return (
              <div
                key={rev._id}
                className="bg-white rounded-2xl p-6 border border-docyra-neutral-border shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            rev.rating >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase ${
                        rev.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {rev.status === 'published' ? 'Published' : 'In Moderation'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-docyra-text-primary">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <div className="text-2xs text-docyra-text-secondary flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" /> {clinic.name || 'Partner Clinic'}
                      </span>
                      <span>•</span>
                      <span>{createdDate.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-docyra-text-primary leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
                  <span>
                    {canEdit ? 'Editable for next few days' : 'Edit window closed (7 days)'}
                  </span>

                  {canEdit && (
                    <button
                      onClick={() => openEditModal(rev)}
                      className="text-xs font-bold text-docyra-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Feedback
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-docyra-text-primary">Edit Review</h3>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-docyra-text-primary uppercase mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className="p-1.5 transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          editRating >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-docyra-text-primary uppercase mb-1.5">
                  Review Comment
                </label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows="4"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-docyra-neutral-border text-sm focus:outline-none focus:ring-2 focus:ring-docyra-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  disabled={submitting}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
