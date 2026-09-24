import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Services from "./pages/Services";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";

import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/Login/ForgotPassword";
import ResetPassword from "./pages/Login/ResetPassword";

import Register from "./pages/Register/Register";

import Checkout from "./pages/Checkout";
import TrackOrder from "./pages/TrackOrder";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";
import "./mobile.css";
import "./luxury-theme.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>

            <Routes>

              {/* =====================================================
                  AUTHENTICATION PAGES
                  These pages do NOT use MainLayout/Navbar
              ===================================================== */}

              <Route
                path="/login"
                element={<Login />}
              />

              <Route
                path="/register"
                element={<Register />}
              />

              <Route
                path="/forgot-password"
                element={<ForgotPassword />}
              />

              <Route
                path="/reset-password"
                element={<ResetPassword />}
              />


              {/* =====================================================
                  MAIN WEBSITE
                  These pages use MainLayout/Navbar
              ===================================================== */}

              <Route element={<MainLayout />}>

                {/* HOME */}
                <Route
                  path="/"
                  element={<Home />}
                />

                <Route
                  path="/home"
                  element={<Home />}
                />

                {/* SHOP */}
                <Route
                  path="/shop"
                  element={<Shop />}
                />

                {/* PRODUCT DETAILS */}
                <Route
                  path="/product/:id"
                  element={<ProductDetails />}
                />

                {/* SERVICES */}
                <Route
                  path="/services"
                  element={<Services />}
                />

                {/* ABOUT */}
                <Route
                  path="/about"
                  element={<About />}
                />

                <Route
                  path="/contact"
                  element={<Contact />}
                />

                {/* ACCOUNT */}
                <Route
                  path="/account"
                  element={<Account />}
                />

                {/* ORDERS */}
                <Route
                  path="/orders"
                  element={<Orders />}
                />

                {/* CART */}
                <Route
                  path="/cart"
                  element={<Cart />}
                />

                {/* WISHLIST */}
                <Route
                  path="/wishlist"
                  element={<Wishlist />}
                />

                {/* CHECKOUT */}
                <Route
                  path="/checkout"
                  element={<Checkout />}
                />

                <Route
                  path="/track"
                  element={<TrackOrder />}
                />

                {/* TERMS */}
                <Route
                  path="/terms"
                  element={<Terms />}
                />

                {/* PRIVACY */}
                <Route
                  path="/privacy"
                  element={<Privacy />}
                />

              </Route>

            </Routes>

          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;