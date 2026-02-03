import { Link, useLocation } from 'react-router-dom';
import { Scale, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui';
import { SearchBar } from '../search/SearchBar';

export function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Nomothetes</span>
            </Link>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className={`text-sm ${
                isActive('/dashboard')
                  ? 'font-medium text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/cases"
              className={`text-sm ${
                isActive('/cases')
                  ? 'font-medium text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Cases
            </Link>
            <Link
              to="/network"
              className={`text-sm ${
                isActive('/network')
                  ? 'font-medium text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Network
            </Link>
            <Link
              to="/analytics"
              className={`text-sm ${
                isActive('/analytics')
                  ? 'font-medium text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Analytics
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <SearchBar />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user?.full_name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
