import { useState, useEffect } from 'react';

interface Link {
  id: string;
  title: string;
  url: string;
  accessedAt: string;
}

const LINKS_STORAGE_KEY = 'obsidian-comments-links';

export function MyLinksPane() {
  const [links, setLinks] = useState<Link[]>([]);
  const [copyMessage, setCopyMessage] = useState<string>('');

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = () => {
    try {
      const storedLinks = localStorage.getItem(LINKS_STORAGE_KEY);
      if (storedLinks) {
        const parsedLinks: Link[] = JSON.parse(storedLinks);
        // Sort by most recently accessed
        const sortedLinks = parsedLinks.sort((a, b) => 
          new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()
        );
        setLinks(sortedLinks);
      }
    } catch (error) {
      console.error('Failed to load links from localStorage:', error);
      setLinks([]);
    }
  };

  const copyAllLinks = async () => {
    try {
      const linkUrls = links.map(link => link.url).join('\n');
      await navigator.clipboard.writeText(linkUrls);
      setCopyMessage('Links copied to clipboard!');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setCopyMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to copy links:', error);
      setCopyMessage('Failed to copy links');
      setTimeout(() => {
        setCopyMessage('');
      }, 3000);
    }
  };

  const copyIndividualLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage('Link copied!');
      setTimeout(() => {
        setCopyMessage('');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setCopyMessage('Failed to copy link');
      setTimeout(() => {
        setCopyMessage('');
      }, 2000);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const accessedDate = new Date(dateString);
    const diffInMs = now.getTime() - accessedDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return accessedDate.toLocaleDateString();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">My Links</h2>
        {copyMessage && (
          <div className={`mt-2 text-sm px-2 py-1 rounded ${
            copyMessage.includes('Failed') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {copyMessage}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {links.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="mb-2 text-gray-400">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m0-3.758l1.102-1.102a4 4 0 015.656 5.656l-4 4a4 4 0 01-5.656 0" />
              </svg>
            </div>
            <p className="font-medium text-gray-600">No links yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Links to documents you visit will appear here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {links.map((link) => (
              <div key={link.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <a
                      href={link.url}
                      className="block font-medium text-gray-900 hover:text-blue-600 truncate"
                      title={link.title}
                    >
                      {link.title}
                    </a>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatRelativeTime(link.accessedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => copyIndividualLink(link.url)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Copy link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {links.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={copyAllLinks}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Copy All Links
          </button>
        </div>
      )}
    </div>
  );
}