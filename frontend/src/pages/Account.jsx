import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiUser,
  FiMail,
  FiShoppingBag,
  FiHeart,
  FiLogOut,
  FiArrowRight
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import './Account.css'

export default function Account() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser()

      if (error || !user) {
        navigate('/login', { replace: true })
        return
      }

      if (mounted) {
        setUser(user)
        setLoading(false)
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [navigate])

  const handleSignOut = async () => {
    setSigningOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      setSigningOut(false)
      return
    }

    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <main className="account-page account-loading">
        <div className="account-loader">
          Loading your account...
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Jawabu Customer'

  const email = user.email || ''

  return (
    <main className="account-page">

      {/* HERO */}

      <section className="account-hero">
        <div className="account-container">

          <div className="account-eyebrow">
            JAWABU BEAUTY
          </div>

          <h1 className="account-title">
            Welcome back,
            <span>{fullName}</span>
          </h1>

          <p className="account-intro">
            Manage your account, orders, wishlist,
            and personal details from one place.
          </p>

        </div>
      </section>


      {/* ACCOUNT CONTENT */}

      <section className="account-content">
        <div className="account-container">

          {/* PROFILE CARD */}

          <div className="account-profile-card">

            <div className="account-avatar">
              <FiUser />
            </div>

            <div className="account-profile-info">

              <h2>{fullName}</h2>

              <div className="account-email">
                <FiMail />
                <span>{email}</span>
              </div>

            </div>

          </div>


          {/* QUICK ACTIONS */}

          <div className="account-grid">

            {/* ORDERS */}

            <Link
              to="/orders"
              className="account-action-card"
            >
              <div className="account-action-icon">
                <FiShoppingBag />
              </div>

              <div className="account-action-content">
                <h3>My Orders</h3>

                <p>
                  View your purchases and
                  order status.
                </p>
              </div>

              <FiArrowRight className="account-action-arrow" />
            </Link>


            {/* WISHLIST */}

            <Link
              to="/wishlist"
              className="account-action-card"
            >
              <div className="account-action-icon">
                <FiHeart />
              </div>

              <div className="account-action-content">
                <h3>My Wishlist</h3>

                <p>
                  View products you've saved
                  for later.
                </p>
              </div>

              <FiArrowRight className="account-action-arrow" />
            </Link>


            {/* SHOP */}

            <Link
              to="/shop"
              className="account-action-card"
            >
              <div className="account-action-icon">
                <FiShoppingBag />
              </div>

              <div className="account-action-content">
                <h3>Continue Shopping</h3>

                <p>
                  Explore the latest Jawabu
                  beauty products.
                </p>
              </div>

              <FiArrowRight className="account-action-arrow" />
            </Link>


            {/* PROFILE */}

            <div className="account-action-card account-action-disabled">
              <div className="account-action-icon">
                <FiUser />
              </div>

              <div className="account-action-content">
                <h3>Profile Details</h3>

                <p>
                  Profile editing will be
                  available soon.
                </p>
              </div>
            </div>

          </div>


          {/* ACCOUNT DETAILS */}

          <section className="account-details">

            <div className="account-section-heading">
              <span>Account</span>
              <h2>Your details</h2>
            </div>

            <div className="account-details-card">

              <div className="account-detail-row">
                <div className="account-detail-label">
                  Name
                </div>

                <div className="account-detail-value">
                  {fullName}
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-label">
                  Email
                </div>

                <div className="account-detail-value">
                  {email}
                </div>
              </div>

            </div>

          </section>


          {/* SIGN OUT */}

          <div className="account-signout-area">

            <button
              type="button"
              className="account-signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <FiLogOut />

              {signingOut
                ? 'Signing out...'
                : 'Sign out'}
            </button>

          </div>

        </div>
      </section>

    </main>
  )
}