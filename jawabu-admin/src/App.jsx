import {
  BrowserRouter,
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

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

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;