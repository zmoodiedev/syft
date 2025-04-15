'use client';

import { useState, useEffect, useRef } from 'react';
import { useFriends } from '../context/FriendsContext';
import { FiSearch } from 'react-icons/fi';
import Button from './Button';

interface UserSearchResult {
    id: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
}

export default function AddFriend() {
    const { sendFriendRequest } = useFriends();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const popupWindowRef = useRef<Window | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setSearchResults(data);
        } catch (err) {
            setError('Failed to search for users');
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async (userId: string) => {
        try {
            await sendFriendRequest(userId);
            setSearchResults(prev => prev.filter(user => user.id !== userId));
        } catch (err) {
            console.error('Error sending friend request:', err);
        }
    };

    const handleShare = () => {
        // Clean up any existing popup window
        if (popupWindowRef.current && !popupWindowRef.current.closed) {
            try {
                popupWindowRef.current.close();
            } catch (e) {
                console.warn('Could not close existing popup window:', e);
            }
        }

        // Clear any existing interval
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }

        const url = `${window.location.origin}/share`;
        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        const newWindow = window.open(
            url,
            'Share Recipe',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (newWindow) {
            popupWindowRef.current = newWindow;
            checkIntervalRef.current = setInterval(() => {
                if (newWindow.closed) {
                    if (checkIntervalRef.current) {
                        clearInterval(checkIntervalRef.current);
                        checkIntervalRef.current = null;
                    }
                    popupWindowRef.current = null;
                }
            }, 1000);
        }
    };

    useEffect(() => {
        return () => {
            // Clean up interval
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }

            // Clean up popup window
            if (popupWindowRef.current && !popupWindowRef.current.closed) {
                try {
                    popupWindowRef.current.close();
                } catch (e) {
                    console.warn('Could not close popup window on cleanup:', e);
                }
            }
        };
    }, []);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Add Friends</h2>
                <Button
                    variant="primary"
                    onClick={handleShare}
                >
                    Share Recipe
                </Button>
            </div>

            <div className="relative mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by email or name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500"
                >
                    <FiSearch className="w-5 h-5" />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {searchResults.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-emerald-600 font-medium">
                                    {user.displayName?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-medium">{user.displayName}</h3>
                                <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => handleSendRequest(user.id)}
                        >
                            Add Friend
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
} 