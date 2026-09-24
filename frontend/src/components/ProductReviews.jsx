import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatDate(value) {
  if (!value) {
    return ''
  }
  return new Date(value).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const ProductReviews = ({ productId }) => {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('customer_reviews')
        .select('id, auth_user_id, rating, comment, created_at')
        .eq('product_id', Number(productId))
        .order('created_at', { ascending: false })

      if (cancelled || error) {
        return
      }

      setReviews(data || [])
      const mine = (data || []).find((row) => row.auth_user_id === user?.id)
      if (mine) {
        setRating(mine.rating || 5)
        setComment(mine.comment || '')
      }
    }

    if (productId) {
      load()
    }

    return () => {
      cancelled = true
    }
  }, [productId, user?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user || saving) {
      return
    }

    setSaving(true)
    setStatus('')

    const { error } = await supabase.from('customer_reviews').upsert(
      {
        auth_user_id: user.id,
        product_id: Number(productId),
        rating: Number(rating),
        comment: comment.trim(),
      },
      { onConflict: 'auth_user_id,product_id' }
    )

    setSaving(false)

    if (error) {
      setStatus('Your review could not be saved. Please try again.')
      return
    }

    setStatus('Thank you. Your review is on this product.')
    const { data } = await supabase
      .from('customer_reviews')
      .select('id, auth_user_id, rating, comment, created_at')
      .eq('product_id', Number(productId))
      .order('created_at', { ascending: false })
    setReviews(data || [])
  }

  return (
    <section className="product-reviews">
      <div className="container">
        <span className="section-eyebrow">REVIEWS</span>
        <h2>What customers say</h2>

        {reviews.length === 0 ? (
          <p className="product-reviews-empty">No reviews yet. Be the first.</p>
        ) : (
          <ul className="product-reviews-list">
            {reviews.map((review) => (
              <li key={review.id}>
                <strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong>
                <span>{formatDate(review.created_at)}</span>
                <p>{review.comment || 'Rated this product.'}</p>
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <form className="checkout-form product-reviews-form" onSubmit={handleSubmit}>
            <div className="checkout-field">
              <label htmlFor="review-rating">Your rating</label>
              <select
                id="review-rating"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — Okay</option>
                <option value="2">2 — Poor</option>
                <option value="1">1 — Bad</option>
              </select>
            </div>
            <div className="checkout-field">
              <label htmlFor="review-comment">Comment</label>
              <textarea
                id="review-comment"
                rows="4"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="How did this product work for you?"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save review'}
            </button>
            {status ? <p>{status}</p> : null}
          </form>
        ) : (
          <p>
            <Link to="/login">Sign in</Link> to leave a review.
          </p>
        )}
      </div>
    </section>
  )
}

export default ProductReviews
