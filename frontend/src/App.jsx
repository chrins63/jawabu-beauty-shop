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
import Account from './pages/Account'
import Orders from './pages/Orders'
import About from "./pages/About";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/Login/ForgotPassword";
import ResetPassword from "./pages/Login/ResetPassword";
import Register from "./pages/Register/Register";
import Checkout from "./pages/Checkout";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>

        <CartProvider>

          <WishlistProvider>

            <Routes>

              {/* Main website layout */}
              <Route element={<MainLayout />}>

                <Route
                  path="/"
                  element={<Home />}
                />

                <Route
                  path="/shop"
                  element={<Shop />}
                />

                <Route
                  path="/product/:id"
                  element={<ProductDetails />}
                />

                <Route
                  path="/services"
                  element={<Services />}
                />

                <Route
                  path="/about"
                  element={<About />}
                />

                <Route
                  path="/account"
                  element={<Account />}
                />

                <Route
                  path="/orders"
                  element={<Orders />}
                />

                <Route
                  path="/cart"
                  element={<Cart />}
                />

                <Route
                  path="/wishlist"
                  element={<Wishlist />}
                />

                <Route
                  path="/checkout"
                  element={<Checkout />}
                />

                <Route
                  path="/login"
                  element={<Login />}
                />

                <Route
                  path="/forgot-password"
                  element={<ForgotPassword />}
                />

                <Route
                  path="/reset-password"
                  element={<ResetPassword />}
                />

                <Route
                  path="/register"
                  element={<Register />}
                />

                <Route
                  path="/terms"
                  element={<Terms />}
                />

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