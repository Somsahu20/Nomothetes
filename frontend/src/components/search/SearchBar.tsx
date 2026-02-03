import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, User, Building2, Loader2 } from 'lucide-react';
import { searchService, SearchSuggestion } from '../../services/search';

export function SearchBar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await searchService.getSuggestions(query);
        setSuggestions(response.suggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut to open search (Ctrl+K on Windows/Linux, Cmd+K on Mac, or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;
      if ((modifierKey && e.key === 'k') || (e.key === '/' && !isOpen)) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setSuggestions([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMac]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setQuery('');
      setSuggestions([]);
    }
  }, [query, navigate]);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'case') {
      navigate(`/cases/${suggestion.id}`);
    } else {
      // For entities, search for them
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}&type=entities`);
    }
    setIsOpen(false);
    setQuery('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        handleSearch();
      }
    }
  };

  const getIcon = (type: string, entityType?: string) => {
    if (type === 'case') {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (entityType === 'PERSON') {
      return <User className="w-4 h-4 text-purple-500" />;
    }
    if (entityType === 'ORG') {
      return <Building2 className="w-4 h-4 text-green-500" />;
    }
    return <Search className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
            <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>K
          </kbd>
        </button>
      )}

      {/* Expanded search input */}
      {isOpen && (
        <div className="absolute right-0 top-0 w-80 sm:w-96 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search cases, entities..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
              />
              {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-2" />}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setSuggestions([]);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Suggestions dropdown */}
            {(suggestions.length > 0 || query.length >= 2) && (
              <div className="max-h-80 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.id}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    {getIcon(suggestion.type, suggestion.entity_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {suggestion.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {suggestion.type}
                        {suggestion.entity_type && ` · ${suggestion.entity_type}`}
                      </p>
                    </div>
                  </button>
                ))}

                {/* View all results option */}
                {query.length >= 2 && (
                  <button
                    onClick={handleSearch}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedIndex === suggestions.length ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <Search className="w-4 h-4 text-primary-500" />
                    <span className="text-sm text-primary-600 dark:text-primary-400">
                      Search for "{query}"
                    </span>
                  </button>
                )}

                {query.length >= 2 && suggestions.length === 0 && !isLoading && (
                  <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No quick results. Press Enter to search.
                  </div>
                )}
              </div>
            )}

            {/* Keyboard hints */}
            {query.length < 2 && (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-4">
                <span>
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> Select
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Close
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
