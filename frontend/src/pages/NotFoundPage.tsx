import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</div>
          <div className="relative -mt-16">
            <Search className="w-20 h-20 mx-auto text-primary-500 opacity-50" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Looking for something specific?
          </p>
          <Link
            to="/search"
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
          >
            Try searching for it →
          </Link>
        </div>
      </div>
    </div>
  );
}
