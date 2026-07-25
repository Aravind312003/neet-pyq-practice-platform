import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Bookmark, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Branding - Blue Square N, bold text NEET PYQ */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm">
                N
              </div>
              <span className="text-gray-900 font-extrabold text-lg tracking-tight font-sans">
                NEET PYQ
              </span>
            </Link>
          </div>

          {/* Navigation Tabs - Dashboard and Saved & Bookmarks */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/') 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/profile"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isActive('/profile') 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              <Bookmark className="w-4 h-4 text-blue-600" />
              <span>Saved & Reports</span>
            </Link>
          </div>

          {/* User Badge and Log Out */}
          <div className="flex items-center gap-3">
            {/* User Pill Badge */}
            <div className="border border-gray-200 bg-gray-50/50 rounded-full px-4 py-1.5 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-xs">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                {user.name.substring(0, 1).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-sans">{user.name}</span>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="p-2 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
