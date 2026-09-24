import { Star } from 'lucide-react';

export function RatingStars({ rating = 0, totalReviews, size = 'sm' }) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const numericRating = Number(rating) || 0;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconSize} ${
              star <= Math.round(numericRating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-neutral-border fill-transparent'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-neutral-text-primary">
        {numericRating > 0 ? numericRating.toFixed(1) : 'New'}
      </span>
      {totalReviews !== undefined && (
        <span className="text-xs text-neutral-text-secondary">({totalReviews})</span>
      )}
    </div>
  );
}

export default RatingStars;
