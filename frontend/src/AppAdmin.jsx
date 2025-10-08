import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LayoutAdmin from './LayoutAdmin';
import DashboardAdmin from './DashboardAdmin';
import ManageBookingAdmin from './ManageBookingAdmin';
import ViewCustomerBillAdmin from './ViewCustomerBillAdmin';
import ReviewsManagementAdmin from './ReviewsManagementAdmin';
import ManageRooms from './ManageRooms';
import EditRoom from './EditRoom';
import AddRoom from './AddRoom';
import CustomerBillListAdmin from './CustomerBillListAdmin';
import ProtectedRouteAdmin from './ProtectedRouteAdmin';
// import AdminLogin from './AdminLogin'; // AdminLogin is now handled in main.jsx
import { useAuthAdmin } from './AuthContextAdmin'; // Import useAuthAdmin

function AppAdmin() {
  const { user } = useAuthAdmin();

  return (
    <Routes>
      {/* Admin Login Route - accessible without protection (now handled in main.jsx) */}
      {/* <Route path="/login" element={<AdminLogin />} /> */}

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRouteAdmin allowedRoles={['admin']} />}>
        <Route path="/" element={<LayoutAdmin />}>
          <Route index element={<DashboardAdmin />} />
          <Route path="dashboard" element={<DashboardAdmin />} />
          <Route path="manage-booking" element={<ManageBookingAdmin />} />
          <Route path="manage-rooms" element={<ManageRooms />} />
          <Route path="manage-rooms/edit/:id" element={<EditRoom />} />
          <Route path="manage-rooms/add" element={<AddRoom />} />
          <Route path="view-customer-bill/:bookingId" element={<ViewCustomerBillAdmin />} />
          <Route path="customer-bills" element={<CustomerBillListAdmin />} />
          <Route path="reviews-management" element={<ReviewsManagementAdmin />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppAdmin;
