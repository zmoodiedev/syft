'use client';

import { useState } from 'react';
import { useFriends } from '../context/FriendsContext';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface UserSearchResult {
    id: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    tier: string | null;
}

export default function AddFriend() {
    const { sendFriendRequest } = useFriends();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
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
            toast.success('Friend request sent successfully');
            setSearchResults(prev => prev.filter(user => user.id !== userId));
        } catch (err) {
            console.error('Error sending friend request:', err);
            // Show error message to user
            if (err instanceof Error) {
                if (err.message === 'Friend request already sent') {
                    toast.error('Friend request already sent');
                } else if (err.message === 'Already friends with this user') {
                    toast.error('Already friends with this user');
                } else {
                    toast.error(err.message || 'Failed to send friend request');
                }
            } else {
                toast.error('Failed to send friend request');
            }
        }
    };

    // Don't render the component if user is not logged in
    if (!user) {
        return null;
    }

    return (
        <div className="py-6">
            <div className="flex items-center justify-between mb-6 flex-col md:flex-row">
                <h2 className="text-xl font-bold">Add Friends</h2>
            </div>

            <div className="relative mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by email or name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg md:rounded-r-none md:rounded-l-lg focus:outline-none focus:ring-2 focus:ring-light-green"
                />
                <Button
                    variant="primary"
                    disabled={isSearching}
                    onClick={handleSearch}
                    className="rounded-lg md:rounded-l-none md:rounded-r-lg"
                >
                    Search
                </Button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {searchResults.map((result) => (
                    <div
                        key={result.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg flex-col md:flex-row"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-light-green/10 rounded-full flex items-center justify-center overflow-hidden">
                                {result.photoURL ? (
                                    <Image 
                                        src={result.photoURL} 
                                        alt={result.displayName || 'User'} 
                                        width={40} 
                                        height={40}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-light-green font-medium">
                                        {result.displayName?.charAt(0) || result.email?.charAt(0) || '?'}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium">{result.displayName || 'No Name'}</h3>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => handleSendRequest(result.id)}
                            className="w-full md:w-auto"
                        >
                            Add Friend
                        </Button>
                    </div>
                ))}
                
                {searchResults.length === 0 && searchQuery && !isSearching && hasSearched && (
                    <p className="text-center text-gray-500 py-4">No users found matching &quot;{searchQuery}&quot;</p>
                )}
            </div>
        </div>
    );
} 