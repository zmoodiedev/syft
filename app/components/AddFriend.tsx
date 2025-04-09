'use client';

import { useState } from 'react';
import { useFriends } from '../context/FriendsContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Button from './Button';

interface UserSearchResult {
    id: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
}

export default function AddFriend() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const { sendFriendRequest } = useFriends();
    const { user } = useAuth();

    const handleSearch = async () => {
        if (!searchQuery.trim() || !user) return;

        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            
            // Try exact match first
            const exactQuery = query(
                usersRef,
                where('email', '==', searchQuery.toLowerCase()),
                limit(10)
            );
            
            let querySnapshot = await getDocs(exactQuery);
            
            // If no results with exact match, try prefix match
            if (querySnapshot.empty) {
                const prefixQuery = query(
                    usersRef,
                    where('email', '>=', searchQuery.toLowerCase()),
                    where('email', '<=', searchQuery.toLowerCase() + '\uf8ff'),
                    limit(10)
                );
                querySnapshot = await getDocs(prefixQuery);
                
                // If still no results, try case-insensitive match
                if (querySnapshot.empty) {
                    console.log('Trying case-insensitive search');
                    const caseInsensitiveQuery = query(
                        usersRef,
                        where('email', '>=', searchQuery.toLowerCase()),
                        where('email', '<=', searchQuery.toUpperCase() + '\uf8ff'),
                        limit(10)
                    );
                    querySnapshot = await getDocs(caseInsensitiveQuery);
                }
            }
            
            const results: UserSearchResult[] = [];

            querySnapshot.forEach((doc) => {
                // Don't include the current user in search results
                if (doc.id !== user.uid) {
                    const data = doc.data();
                    console.log('Found user:', data.email);
                    results.push({
                        id: doc.id,
                        displayName: data.displayName,
                        email: data.email,
                        photoURL: data.photoURL
                    });
                }
            });

            setSearchResults(results);
            
            // Show a message if no results were found
            if (results.length === 0) {
                toast.error('No users found with that email address');
            }
        } catch (error: unknown) {
            console.error('Error searching for users:', error);
            toast.error('Failed to search for users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (userId: string) => {
        try {
            await sendFriendRequest(userId);
            toast.success('Friend request sent!');
            // Clear search results after sending request
            setSearchResults([]);
            setSearchQuery('');
        } catch (error: unknown) {
            console.error('Error sending friend request:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Failed to send friend request');
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add Friends</h2>
            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    placeholder="Search by email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch();
                        }
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
                <Button
                    variant="primary"
                    onClick={handleSearch}
                    disabled={loading}
                >
                    {loading ? 'Searching...' : 'Search'}
                </Button>
            </div>

            {/* Search Results */}
            <div className="space-y-4">
                {searchResults.map((result) => (
                    <div
                        key={result.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                        <div className="flex items-center space-x-3">
                            {result.photoURL ? (
                                <Image
                                    src={result.photoURL}
                                    alt={result.displayName || 'User'}
                                    width={40}
                                    height={40}
                                    className="rounded-full"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-gray-500 text-lg">
                                        {(result.displayName || result.email || '?')[0].toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium">
                                    {result.displayName || 'Unknown User'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {result.email}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => handleSendRequest(result.id)}
                        >
                            Add Friend
                        </Button>
                    </div>
                ))}

                {searchQuery && searchResults.length === 0 && !loading && (
                    <p className="text-gray-500 text-center py-4">
                        No users found with that email.
                    </p>
                )}
            </div>
        </div>
    );
} 