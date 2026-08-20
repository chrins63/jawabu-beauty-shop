import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiHeart,
  FiShoppingBag,
  FiUser,
  FiSearch,
  FiMenu,
  FiX,
  FiLogOut,
  FiChevronDown
} from 'react-icons/fi'

import { supabase } from '../lib/supabase'
import { useCart } from '../context/useCart'
import { useWishlist } from '../context/useWishlist'

import './Navbar.css'

const Navbar = () => {
  const { cartCount } = useCart()
  const { wishlistItems } = useWishlist()

  const wishlistCount = wishlistItems.length

  const [user, setUser] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  /* =========================================
     GET CURRENT USER
  ========================================= */

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (mounted) {
        setUser(user)
      }
    }

    loadUser()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /* =========================================
     NAVBAR SCROLL EFFECT
  ========================================= */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    handleScroll()

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      )
    }
  }, [])

  /* =========================================
     CLOSE ACCOUNT DROPDOWN OUTSIDE
  ========================================= */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(
          '.navbar-account-wrapper'
        )
      ) {
        setAccountOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  /* =========================================
     ESCAPE KEY
  ========================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setAccountOpen(false)
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [])

  /* =========================================
     SIGN OUT
  ========================================= */

  const handleSignOut = async () => {
    const { error } =
      await supabase.auth.signOut()

    if (error) {
      console.error(
        'Sign out error:',
        error
      )
      return
    }

    setUser(null)
    setAccountOpen(false)
    setMobileOpen(false)

    window.location.href = '/'
  }

  /* =========================================
     DISPLAY NAME
  ========================================= */

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Account'

  return (
    <>
      {/* =====================================
          DESKTOP / MAIN NAVBAR
      ===================================== */}

      <header
        className={`navbar${
          scrolled
            ? ' navbar--scrolled'
            : ''
        }`}
      >

        <div className="navbar-container">

          {/* =================================
              MOBILE MENU BUTTON
          ================================= */}

          <button
            type="button"
            className="navbar-icon-btn navbar-menu-btn"
            aria-label={
              mobileOpen
                ? 'Close menu'
                : 'Open menu'
            }
            aria-expanded={mobileOpen}
            onClick={() =>
              setMobileOpen(
                current => !current
              )
            }
          >
            {mobileOpen ? (
              <FiX />
            ) : (
              <FiMenu />
            )}
          </button>


          {/* =================================
              LOGO
          ================================= */}

          <Link
            to="/"
            className="navbar-logo"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <span className="navbar-logo-mark">
              JAWABU
            </span>

            <span className="navbar-logo-script">
              Beauty
            </span>
          </Link>


          {/* =================================
              DESKTOP NAVIGATION
          ================================= */}

          <nav
            className="navbar-links"
            aria-label="Main navigation"
          >

            <Link
              to="/"
              className="navbar-link"
            >
              Home
            </Link>

            <Link
              to="/shop"
              className="navbar-link"
            >
              Shop
            </Link>

            <Link
              to="/services"
              className="navbar-link"
            >
              Services
            </Link>

            <Link
              to="/about"
              className="navbar-link"
            >
              About
            </Link>

          </nav>


          {/* =================================
              RIGHT SIDE ACTIONS
          ================================= */}

          <div className="navbar-actions">

            {/* SEARCH */}

            <button
              type="button"
              className="navbar-icon-btn"
              aria-label="Search"
            >
              <FiSearch />
            </button>


            {/* WISHLIST */}

            <Link
              to="/wishlist"
              className="navbar-icon-btn"
              aria-label={`Wishlist${
                wishlistCount > 0
                  ? `, ${wishlistCount} items`
                  : ''
              }`}
            >

              <FiHeart />

              {wishlistCount > 0 && (
                <span className="navbar-badge">
                  {wishlistCount > 99
                    ? '99+'
                    : wishlistCount}
                </span>
              )}

            </Link>


            {/* CART */}

            <Link
              to="/cart"
              className="navbar-icon-btn"
              aria-label={`Shopping cart${
                cartCount > 0
                  ? `, ${cartCount} items`
                  : ''
              }`}
            >

              <FiShoppingBag />

              {cartCount > 0 && (
                <span className="navbar-badge">
                  {cartCount > 99
                    ? '99+'
                    : cartCount}
                </span>
              )}

            </Link>


            {/* =================================
                ACCOUNT
            ================================= */}

            <div className="navbar-account-wrapper">

              {/* ACCOUNT BUTTON */}

              <button
                type="button"
                className="navbar-account"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                onClick={() =>
                  setAccountOpen(
                    current => !current
                  )
                }
              >

                <FiUser />

                <span>
                  {user
                    ? displayName
                    : 'Account'}
                </span>

                <FiChevronDown
                  className={`navbar-account-chevron${
                    accountOpen
                      ? ' is-open'
                      : ''
                  }`}
                />

              </button>


              {/* =================================
                  ACCOUNT DROPDOWN
              ================================= */}

              {accountOpen && (
                <div
                  className="navbar-account-dropdown"
                  role="menu"
                >

                  {user ? (
                    <>

                      {/* USER INFO */}

                      <div className="navbar-account-header">

                        <span className="navbar-account-name">
                          {displayName}
                        </span>

                        <span className="navbar-account-email">
                          {user.email}
                        </span>

                      </div>


                      {/* MY ACCOUNT */}

                      <Link
                        to="/account"
                        className="navbar-account-link"
                        onClick={() =>
                          setAccountOpen(false)
                        }
                      >

                        <FiUser />

                        <span>
                          My Account
                        </span>

                      </Link>


                      {/* SIGN OUT */}

                      <button
                        type="button"
                        className="navbar-signout"
                        onClick={
                          handleSignOut
                        }
                      >

                        <FiLogOut />

                        <span>
                          Sign out
                        </span>

                      </button>

                    </>
                  ) : (
                    <>

                      {/* GUEST */}

                      <div className="navbar-account-header">

                        <span className="navbar-account-name">
                          Welcome to Jawabu
                        </span>

                        <span className="navbar-account-email">
                          Sign in to your account
                        </span>

                      </div>


                      {/* SIGN IN */}

                      <Link
                        to="/login"
                        className="navbar-account-link"
                        onClick={() =>
                          setAccountOpen(false)
                        }
                      >

                        <FiUser />

                        <span>
                          Sign in
                        </span>

                      </Link>


                      {/* CREATE ACCOUNT */}

                      <Link
                        to="/register"
                        className="navbar-account-link"
                        onClick={() =>
                          setAccountOpen(false)
                        }
                      >

                        <span>
                          Create account
                        </span>

                      </Link>

                    </>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>

      </header>


      {/* =====================================
          MOBILE BACKDROP
      ===================================== */}

      {mobileOpen && (
        <button
          type="button"
          className="navbar-mobile-backdrop"
          aria-label="Close menu"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}


      {/* =====================================
          MOBILE MENU
      ===================================== */}

      <aside
        className={`navbar-mobile-panel${
          mobileOpen
            ? ' is-open'
            : ''
        }`}
        aria-hidden={!mobileOpen}
      >

        <nav className="navbar-mobile-links">

          <Link
            to="/"
            className="navbar-mobile-link"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            Home
          </Link>

          <Link
            to="/shop"
            className="navbar-mobile-link"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            Shop
          </Link>

          <Link
            to="/services"
            className="navbar-mobile-link"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            Services
          </Link>

          <Link
            to="/about"
            className="navbar-mobile-link"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            About
          </Link>

        </nav>


        <div className="navbar-mobile-divider" />


        {/* MOBILE ACCOUNT */}

        {user ? (
          <>

            <Link
              to="/account"
              className="navbar-mobile-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              My Account
            </Link>

            <button
              type="button"
              className="navbar-mobile-signout"
              onClick={handleSignOut}
            >

              <FiLogOut />

              Sign out

            </button>

          </>
        ) : (
          <>

            <Link
              to="/login"
              className="navbar-mobile-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="navbar-mobile-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Create account
            </Link>

          </>
        )}

      </aside>
    </>
  )
}

export default Navbar