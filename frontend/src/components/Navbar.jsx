import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  FiHeart,
  FiShoppingBag,
  FiUser,
  FiSearch,
  FiMenu,
  FiX,
  FiLogOut,
  FiChevronDown,
  FiArrowRight,
  FiPackage,
  FiMapPin
} from "react-icons/fi";

import { supabase } from "../lib/supabase";
import { useCart } from "../context/useCart";
import { useWishlist } from "../context/useWishlist";
import BrandLogo from "./BrandLogo";
import { BRAND } from "../lib/brand";
import { getStorefrontCommerce } from "../lib/storefront";
import { whatsappHref, defaultWhatsAppText } from "../lib/whatsapp";

import "./Navbar.css";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/track", label: "Track" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" }
];

const Navbar = () => {
  const { cartCount } = useCart();
  const { wishlistItems } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();

  const wishlistCount = wishlistItems.length;

  const [user, setUser] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [whatsapp, setWhatsapp] = useState(
    whatsappHref(BRAND.phone, defaultWhatsAppText())
  );

  const accountButtonRef = useRef(null);
  const accountMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  /* =====================================================
     GET CURRENT USER
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (mounted) {
        setUser(user);
      }
    };

    loadUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    getStorefrontCommerce().then((data) => {
      setWhatsapp(
        whatsappHref(data.whatsapp_number || BRAND.phone, defaultWhatsAppText())
      );
    });
  }, []);

  /* =====================================================
     NAVBAR SCROLL EFFECT (mirror intensifies on scroll)
  ===================================================== */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /* =====================================================
     CLOSE ACCOUNT DROPDOWN OUTSIDE
  ===================================================== */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".navbar-account-wrapper")) {
        setAccountOpen(false);
      }
      if (!event.target.closest(".navbar-search-wrapper")) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* =====================================================
     ESCAPE KEY + RETURN FOCUS
  ===================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (accountOpen) {
          setAccountOpen(false);
          accountButtonRef.current?.focus();
        }
        if (searchOpen) {
          setSearchOpen(false);
        }
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen, searchOpen]);

  /* =====================================================
     LOCK BODY SCROLL WHILE MOBILE PANEL OPEN
  ===================================================== */

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* =====================================================
     CLOSE OVERLAYS ON ROUTE CHANGE
  ===================================================== */

  useEffect(() => {
    let rafId = null;

    rafId = window.requestAnimationFrame(() => {
      setMobileOpen(false);
      setAccountOpen(false);
      setSearchOpen(false);
    });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [location.pathname]);

  /* =====================================================
     AUTOFOCUS SEARCH WHEN OPENED
  ===================================================== */

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  /* =====================================================
     KEYBOARD NAVIGATION INSIDE ACCOUNT DROPDOWN
  ===================================================== */

  const handleAccountMenuKeyDown = (event) => {
    const items = Array.from(
      accountMenuRef.current?.querySelectorAll(
        "[role='menuitem']"
      ) ?? []
    );

    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = items[(currentIndex + 1) % items.length];
      next?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev =
        items[(currentIndex - 1 + items.length) % items.length];
      prev?.focus();
    }

    if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  /* =====================================================
     SEARCH SUBMIT
  ===================================================== */

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      searchInputRef.current?.focus();
      return;
    }

    navigate(`/shop?search=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchValue("");
  };

  /* =====================================================
     SIGN OUT
  ===================================================== */

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      return;
    }

    setUser(null);
    setAccountOpen(false);
    setMobileOpen(false);

    window.location.href = "/";
  };

  /* =====================================================
     DISPLAY NAME
  ===================================================== */

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <>
      {/* =====================================================
          DESKTOP / MAIN NAVBAR
      ===================================================== */}

      <header
        className={`navbar${scrolled ? " navbar--scrolled" : ""}`}
      >
        {/* mirror sheen layer, purely decorative */}
        <div className="navbar-sheen" aria-hidden="true" />

        <div className="navbar-container">
          {/* =================================================
              MOBILE MENU BUTTON
          ================================================= */}

          <button
            type="button"
            className="navbar-icon-btn navbar-menu-btn"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
          >
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>

          {/* =================================================
              LOGO
          ================================================= */}

          <BrandLogo
            onClick={() => {
              setMobileOpen(false);
              setAccountOpen(false);
            }}
          />

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav className="navbar-links" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-link${
                  isActive(link.to) ? " is-active" : ""
                }`}
                aria-current={isActive(link.to) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* =================================================
              RIGHT SIDE ACTIONS
          ================================================= */}

          <div className="navbar-actions">
            {/* =============================================
                SEARCH (now functional)
            ============================================= */}

            <div className="navbar-search-wrapper">
              <button
                type="button"
                className="navbar-icon-btn"
                aria-label={searchOpen ? "Close search" : "Search"}
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((current) => !current)}
              >
                {searchOpen ? <FiX /> : <FiSearch />}
              </button>

              {searchOpen && (
                <form
                  className="navbar-search-flyout"
                  onSubmit={handleSearchSubmit}
                  role="search"
                >
                  <FiSearch className="navbar-search-flyout-icon" />

                  <input
                    ref={searchInputRef}
                    type="text"
                    className="navbar-search-input"
                    placeholder="Search Sleek Sisters..."
                    value={searchValue}
                    onChange={(event) =>
                      setSearchValue(event.target.value)
                    }
                    aria-label="Search products"
                  />

                  <button
                    type="submit"
                    className="navbar-search-submit"
                    aria-label="Submit search"
                  >
                    <FiArrowRight />
                  </button>
                </form>
              )}
            </div>

            {/* WHATSAPP */}

            <a
              href={whatsapp}
              className="navbar-icon-btn"
              aria-label="WhatsApp Sleek Sisters"
              target="_blank"
              rel="noreferrer"
            >
              <span className="navbar-whatsapp-glyph" aria-hidden="true">
                WA
              </span>
            </a>

            {/* WISHLIST */}

            <Link
              to="/wishlist"
              className="navbar-icon-btn"
              aria-label={`Wishlist${
                wishlistCount > 0 ? `, ${wishlistCount} items` : ""
              }`}
            >
              <FiHeart />

              {wishlistCount > 0 && (
                <span className="navbar-badge">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* CART */}

            <Link
              to="/cart"
              className="navbar-icon-btn"
              aria-label={`Shopping cart${
                cartCount > 0 ? `, ${cartCount} items` : ""
              }`}
            >
              <FiShoppingBag />

              {cartCount > 0 && (
                <span className="navbar-badge">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* =================================================
                ACCOUNT
            ================================================= */}

            <div className="navbar-account-wrapper">
              <button
                ref={accountButtonRef}
                type="button"
                className="navbar-account"
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((current) => !current)}
              >
                <FiUser />
                <span>{user ? displayName : "Account"}</span>
                <FiChevronDown
                  className={`navbar-account-chevron${
                    accountOpen ? " is-open" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <div
                  ref={accountMenuRef}
                  className="navbar-account-dropdown"
                  role="menu"
                  onKeyDown={handleAccountMenuKeyDown}
                >
                  {user ? (
                    <>
                      <div className="navbar-account-header">
                        <span className="navbar-account-name">
                          {displayName}
                        </span>
                        <span className="navbar-account-email">
                          {user.email}
                        </span>
                      </div>

                      <Link
                        to="/account"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiUser />
                        <span>My Account</span>
                      </Link>

                      <Link
                        to="/orders"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiPackage />
                        <span>My Orders</span>
                      </Link>

                      <Link
                        to="/track"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiMapPin />
                        <span>Track order</span>
                      </Link>

                      <Link
                        to="/wishlist"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiHeart />
                        <span>Wishlist</span>
                        {wishlistCount > 0 && (
                          <span className="navbar-account-link-count">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>

                      <div className="navbar-account-divider" />

                      <button
                        type="button"
                        className="navbar-signout"
                        role="menuitem"
                        onClick={handleSignOut}
                      >
                        <FiLogOut />
                        <span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="navbar-account-header">
                        <span className="navbar-account-name">
                          Welcome to Sleek Sisters
                        </span>
                        <span className="navbar-account-email">
                          Sign in to your account
                        </span>
                      </div>

                      <Link
                        to="/login"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiUser />
                        <span>Sign in</span>
                      </Link>

                      <Link
                        to="/register"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiArrowRight />
                        <span>Create account</span>
                      </Link>

                      <Link
                        to="/track"
                        className="navbar-account-link"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                      >
                        <FiMapPin />
                        <span>Track order</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          className="navbar-mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      <aside
        className={`navbar-mobile-panel${mobileOpen ? " is-open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <BrandLogo
          onClick={() => {
            setMobileOpen(false);
            setAccountOpen(false);
          }}
        />

        <form
          className="navbar-mobile-search"
          onSubmit={handleSearchSubmit}
          role="search"
        >
          <FiSearch />
          <input
            type="text"
            placeholder="Search Sleek Sisters..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            aria-label="Search products"
          />
        </form>

        <nav className="navbar-mobile-links">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-mobile-link${
                isActive(link.to) ? " is-active" : ""
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/cart"
            className="navbar-mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            Cart
          </Link>
          <Link
            to="/wishlist"
            className="navbar-mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            Wishlist
          </Link>
          <Link
            to="/orders"
            className="navbar-mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            My Orders
          </Link>
          <a
            href={whatsapp}
            className="navbar-mobile-link"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileOpen(false)}
          >
            WhatsApp
          </a>
        </nav>

        <div className="navbar-mobile-divider" />

        {/* =================================================
            MOBILE ACCOUNT
        ================================================= */}

        {user ? (
          <>
            <p className="navbar-mobile-account-label">
              Signed in as {displayName}
            </p>
            <Link
              to="/account"
              className="navbar-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              My Account
            </Link>
            <Link
              to="/orders"
              className="navbar-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              My Orders
            </Link>
            <Link
              to="/track"
              className="navbar-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Track order
            </Link>
            <Link
              to="/wishlist"
              className="navbar-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Wishlist
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
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="navbar-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Create account
            </Link>
            <Link
              to="/track"
              className="navbar-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              Track order
            </Link>
          </>
        )}
      </aside>
    </>
  );
};

export default Navbar;