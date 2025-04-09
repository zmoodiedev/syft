'use client';

import FriendsList from '@/app/components/FriendsList';
import AddFriend from '@/app/components/AddFriend';
import SharedRecipesList from '@/app/components/SharedRecipesList';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useFriends } from '@/app/context/FriendsContext';

export default function FriendsPage() {
    const { sharedRecipes } = useFriends();
    
    const hasSharedRecipes = sharedRecipes.length > 0;
    
    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Friends</h1>
                
                {/* Show shared recipes at the top if there are any */}
                {hasSharedRecipes && (
                    <div className="mb-8">
                        <SharedRecipesList />
                    </div>
                )}
                
                <div className="grid gap-8 md:grid-cols-2">
                    <FriendsList />
                    <AddFriend />
                </div>
            </div>
        </ProtectedRoute>
    );
} 