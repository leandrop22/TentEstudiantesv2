import { Routes, Route, BrowserRouter } from 'react-router-dom';
import Home from './pages/Home';
import Checkin from './pages/Checkin';
import Register from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/Admin/AdminLayout';



function App() {
  return (
    
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/checkin" 
            element={
            
                <Checkin/>
              
            } 
          />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/*" element={<AdminLayout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payment/success" element={<Profile />} />
          <Route path="/payment/failure" element={<Profile />} />
          <Route path="/payment/pending" element={<Profile />} />
          
        </Routes>
      </AuthProvider>
   
  );
}

export default App; 
