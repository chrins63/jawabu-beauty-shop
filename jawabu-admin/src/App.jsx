import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import Inventory from './pages/Inventory';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import POS from './pages/POS';
import Reports from './pages/Reports';
import Payments from './pages/Payments.jsx';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import Staff from './pages/Staff';


function App() {
  const Router = window.sleekDesktop ? HashRouter : BrowserRouter;

  return (
    <AuthProvider>
      <Router>

        <Routes>

          {/* PUBLIC */}

          <Route
            path="/login"
            element={<Login />}
          />


          {/* PROTECTED ADMIN SYSTEM */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  'owner',
                  'manager',
                  'staff',
                  'admin',
                ]}
              />
            }
          >

            <Route
              element={<AdminLayout />}
            >

              {/* DASHBOARD */}

              <Route
                path="/"
                element={<Dashboard />}
              />


              {/* ORDERS */}

              <Route
                path="/orders"
                element={<Orders />}
              />


              {/* PRODUCTS */}

              <Route
                path="/products"
                element={<Products />}
              />


              {/* ADD PRODUCT */}

              <Route
                path="/products/new"
                element={<AddProduct />}
              />


              {/* EDIT PRODUCT */}

              <Route
                path="/products/:id/edit"
                element={<EditProduct />}
              />
              <Route
  path="/inventory"
  element={<Inventory />}
/>


            <Route
  path="/pos"
  element={<POS />}
/>

<Route
  path="/reports"
  element={<Reports />}
/>

<Route
  path="/payments"
  element={<Payments />}
/>
            <Route
  path="/customers"
  element={<Customers />}
/>
            <Route
              path="/settings"
              element={<Settings />}
            />
            <Route
              path="/categories"
              element={<Categories />}
            />
            <Route
              path="/staff/profile/:userId"
              element={<Staff />}
            />
            <Route
              path="/staff/reset/:userId"
              element={<Staff />}
            />
            <Route
              path="/staff"
              element={<Staff />}
            />
            </Route>

          </Route>


          {/* FALLBACK */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </Router>
    </AuthProvider>
  );
}

export default App;