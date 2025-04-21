import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { EmailItem } from './EmailList';

interface EmailSearchProps {
  emails: EmailItem[];
  onFilteredResults: (results: EmailItem[]) => void;
}

const EmailSearch: React.FC<EmailSearchProps> = ({ emails, onFilteredResults }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (!term.trim()) {
        onFilteredResults(emails);
        return;
      }

      const normalizedTerm = term.toLowerCase().trim();
      const results = emails.filter(
        (email) =>
          email.subject.toLowerCase().includes(normalizedTerm) ||
          email.from.toLowerCase().includes(normalizedTerm) ||
          (email.otp && email.otp.includes(normalizedTerm))
      );

      onFilteredResults(results);
    },
    [emails, onFilteredResults]
  );

  const clearSearch = () => {
    setSearchTerm('');
    onFilteredResults(emails);
  };

  return (
    <div className="relative mb-3">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search size={16} className="text-zinc-400" />
        </div>
        <input
          type="text"
          className="w-full p-2 pl-10 pr-8 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search emails..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
        />
        {searchTerm && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={clearSearch}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {isActive && searchTerm && (
        <div className="absolute right-2 bottom-1 translate-y-full text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 z-10">
          Searching: subject, sender, and OTP codes
        </div>
      )}
    </div>
  );
};

export default EmailSearch;
