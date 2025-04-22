'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import {
    collection,
    query as firestoreQuery,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    DocumentData,
    updateDoc,
    limit
} from 'firebase/firestore';

interface FriendRequest {
    id: string;
    senderId: string;
    receiverId: string;
    senderName: string;
    senderEmail: string;
    senderPhotoURL: string | null;
    receiverName: string;
    receiverEmail: string;
    receiverPhotoURL: string | null;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
}

interface Friend {
    id: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
}

interface SharedRecipe {
    id: string;
    recipeId: string;
    recipeName: string;
    recipeImageUrl?: string;
    senderId: string;
    senderName: string | null;
    receiverId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
}

interface UserSearchResult {
    id: string;
    displayName: string;
    photoURL: string | null;
}

interface FriendsContextType {
    friends: Friend[];
    incomingRequests: FriendRequest[];
    outgoingRequests: FriendRequest[];
    sharedRecipes: SharedRecipe[];
    sendFriendRequest: (userId: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    cancelFriendRequest: (requestId: string) => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    shareRecipeWithFriend: (recipeId: string, recipeName: string, recipeImageUrl: string | undefined, friendId: string) => Promise<void>;
    acceptSharedRecipe: (sharedRecipeId: string) => Promise<void>;
    rejectSharedRecipe: (sharedRecipeId: string) => Promise<void>;
    loading: boolean;
    searchUsers: (query: string) => Promise<UserSearchResult[]>;
}

const FriendsContext = createContext<FriendsContextType>({} as FriendsContextType);

export function useFriends() {
    return useContext(FriendsContext);
}

export function FriendsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [sharedRecipes, setSharedRecipes] = useState<SharedRecipe[]>([]);
    const [loading, setLoading] = useState(true);

    // Listen to friend requests and shared recipes
    useEffect(() => {
        if (!user) {
            setFriends([]);
            setIncomingRequests([]);
            setOutgoingRequests([]);
            setSharedRecipes([]);
            setLoading(false);
            return;
        }

        // Listen to incoming friend requests
        const incomingRequestsQuery = firestoreQuery(
            collection(db, 'friendRequests'),
            where('receiverId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const outgoingRequestsQuery = firestoreQuery(
            collection(db, 'friendRequests'),
            where('senderId', '==', user.uid),
            where('status', '==', 'pending')
        );

        // Listen to friendships
        const friendshipsQuery = firestoreQuery(
            collection(db, 'friendships'),
            where('userIds', 'array-contains', user.uid)
        );

        const unsubscribeIncoming = onSnapshot(incomingRequestsQuery, (snapshot) => {
            const requests = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    senderName: data.senderName,
                    senderEmail: data.senderEmail,
                    senderPhotoURL: data.senderPhotoURL,
                    receiverName: data.receiverName,
                    receiverEmail: data.receiverEmail,
                    receiverPhotoURL: data.receiverPhotoURL,
                    status: data.status,
                    createdAt: data.createdAt?.toDate()
                } as FriendRequest;
            });
            setIncomingRequests(requests);
        });

        const unsubscribeOutgoing = onSnapshot(outgoingRequestsQuery, (snapshot) => {
            const requests = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    senderName: data.senderName,
                    senderEmail: data.senderEmail,
                    senderPhotoURL: data.senderPhotoURL,
                    receiverName: data.receiverName,
                    receiverEmail: data.receiverEmail,
                    receiverPhotoURL: data.receiverPhotoURL,
                    status: data.status,
                    createdAt: data.createdAt?.toDate()
                } as FriendRequest;
            });
            setOutgoingRequests(requests);
        });

        const unsubscribeFriends = onSnapshot(friendshipsQuery, async (snapshot) => {
            const friendPromises = snapshot.docs.map(async (docSnapshot) => {
                const friendshipData = docSnapshot.data();
                const friendId = friendshipData.userIds.find((id: string) => id !== user.uid);
                
                if (!friendId) return null;

                const userDocRef = doc(db, 'users', friendId);
                const friendDoc = await getDoc(userDocRef);
                if (!friendDoc.exists()) return null;

                const friendData = friendDoc.data() as DocumentData;
                return {
                    id: friendId,
                    displayName: friendData.displayName as string | null,
                    email: friendData.email as string | null,
                    photoURL: friendData.photoURL as string | null
                } as Friend;
            });

            const friendsList = (await Promise.all(friendPromises)).filter((friend): friend is Friend => friend !== null);
            setFriends(friendsList);
            setLoading(false);
        });

        // Set up a separate effect for shared recipes
        let unsubscribeSharedRecipes = () => {};
        
        // Separate try-catch only for shared recipes to handle permissions issues gracefully
        try {
            console.log('Setting up shared recipes listener for user:', user.uid);
            const sharedRecipesRef = collection(db, 'sharedRecipes');
            
            const listener = onSnapshot(
                sharedRecipesRef,
                (snapshot) => {
                    console.log('Shared recipes snapshot received:', snapshot.size, 'total documents');
                    const recipes = snapshot.docs
                        .filter(doc => {
                            const data = doc.data();
                            return data.receiverId === user.uid && data.status === 'pending';
                        })
                        .map(doc => {
                            const data = doc.data();
                            // Handle createdAt safely
                            let createdAtDate = new Date();
                            if (data.createdAt?.toDate) {
                                try {
                                    createdAtDate = data.createdAt.toDate();
                                } catch {
                                    // Use default date
                                }
                            }
                            
                            return {
                                id: doc.id,
                                recipeId: data.recipeId || '',
                                recipeName: data.recipeName || '',
                                recipeImageUrl: data.recipeImageUrl,
                                senderId: data.senderId || '',
                                senderName: data.senderName || null,
                                receiverId: data.receiverId || '',
                                status: (data.status as 'pending' | 'accepted' | 'rejected') || 'pending',
                                createdAt: createdAtDate
                            };
                        });
                        
                    console.log('Filtered shared recipes for current user:', recipes.length);
                    setSharedRecipes(recipes);
                },
                (error) => {
                    console.error('Error in shared recipes listener:', error);
                    setSharedRecipes([]);
                }
            );
            
            unsubscribeSharedRecipes = listener;
        } catch (error) {
            console.error('Error setting up shared recipes listener:', error);
        }

        return () => {
            unsubscribeIncoming();
            unsubscribeOutgoing();
            unsubscribeFriends();
            unsubscribeSharedRecipes();
        };
    }, [user]);

    // Manually fetch shared recipes periodically as a fallback
    useEffect(() => {
        if (!user) return;
        
        const fetchSharedRecipes = async () => {
            try {
                const recipesRef = collection(db, 'sharedRecipes');
                const recipesSnapshot = await getDocs(recipesRef);
                
                const recipes = recipesSnapshot.docs
                    .filter(doc => {
                        const data = doc.data();
                        return data.receiverId === user.uid && data.status === 'pending';
                    })
                    .map(doc => {
                        const data = doc.data();
                        // Handle createdAt safely
                        let createdAtDate = new Date();
                        if (data.createdAt?.toDate) {
                            try {
                                createdAtDate = data.createdAt.toDate();
                            } catch {
                                // Use default date
                            }
                        }
                        
                        return {
                            id: doc.id,
                            recipeId: data.recipeId || '',
                            recipeName: data.recipeName || '',
                            recipeImageUrl: data.recipeImageUrl,
                            senderId: data.senderId || '',
                            senderName: data.senderName || null,
                            receiverId: data.receiverId || '',
                            status: (data.status as 'pending' | 'accepted' | 'rejected') || 'pending',
                            createdAt: createdAtDate
                        };
                    });
                
                setSharedRecipes(recipes);
            } catch (error) {
                console.error('Error in manual shared recipes fetch:', error);
            }
        };
        
        // Fetch immediately
        fetchSharedRecipes();
        
        // Then fetch every 30 seconds as a backup
        const interval = setInterval(fetchSharedRecipes, 30000);
        
        return () => clearInterval(interval);
    }, [user]);

    const sendFriendRequest = async (receiverId: string) => {
        if (!user) throw new Error('Must be logged in to send friend requests');

        console.log('Sending friend request to:', receiverId);
        
        try {
            // Check if users are trying to friend themselves
            if (user.uid === receiverId) {
                throw new Error('You cannot send a friend request to yourself');
            }
            
            // Check if a friend request already exists from sender to receiver
            const outgoingRequestsQuery = firestoreQuery(
                collection(db, 'friendRequests'),
                where('senderId', '==', user.uid),
                where('receiverId', '==', receiverId),
                where('status', '==', 'pending')
            );

            const outgoingRequestsSnapshot = await getDocs(outgoingRequestsQuery);
            if (!outgoingRequestsSnapshot.empty) {
                throw new Error('Friend request already sent');
            }
            
            // Check if a friend request already exists from receiver to sender
            const incomingRequestsQuery = firestoreQuery(
                collection(db, 'friendRequests'),
                where('senderId', '==', receiverId),
                where('receiverId', '==', user.uid),
                where('status', '==', 'pending')
            );
            
            const incomingRequestsSnapshot = await getDocs(incomingRequestsQuery);
            if (!incomingRequestsSnapshot.empty) {
                throw new Error('This user has already sent you a friend request');
            }

            // Check if they're already friends (checking both possible IDs)
            const friendshipId1 = `${user.uid}_${receiverId}`;
            const friendshipId2 = `${receiverId}_${user.uid}`;
            
            const [friendshipDoc1, friendshipDoc2] = await Promise.all([
                getDoc(doc(db, 'friendships', friendshipId1)),
                getDoc(doc(db, 'friendships', friendshipId2))
            ]);
            
            if (friendshipDoc1.exists() || friendshipDoc2.exists()) {
                throw new Error('Already friends with this user');
            }

            // Get receiver's user data
            const receiverDoc = await getDoc(doc(db, 'users', receiverId));
            if (!receiverDoc.exists()) {
                throw new Error('User not found');
            }
            const receiverData = receiverDoc.data();

            console.log('Creating friend request with data:', {
                senderId: user.uid,
                receiverId,
                senderName: user.displayName || 'Unknown User',
                senderEmail: user.email,
                senderPhotoURL: user.photoURL,
                receiverName: receiverData.displayName || 'Unknown User',
                receiverEmail: receiverData.email,
                receiverPhotoURL: receiverData.photoURL,
                status: 'pending'
            });

            // Create the friend request
            const requestRef = await addDoc(collection(db, 'friendRequests'), {
                senderId: user.uid,
                receiverId,
                senderName: user.displayName || 'Unknown User',
                senderEmail: user.email,
                senderPhotoURL: user.photoURL,
                receiverName: receiverData.displayName || 'Unknown User',
                receiverEmail: receiverData.email,
                receiverPhotoURL: receiverData.photoURL,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            
            // Create a notification for the recipient
            try {
                // Import dynamically to avoid circular dependencies
                const { createFriendRequestNotification } = await import('@/app/lib/notification');
                
                await createFriendRequestNotification(
                    receiverId,
                    user.uid,
                    user.displayName || null,
                    user.photoURL || null,
                    requestRef.id // Pass the request ID
                );
            } catch (notificationError) {
                console.error('Error creating friend request notification:', notificationError);
                // Continue even if notification creation fails
            }
            
            console.log('Friend request sent successfully');
        } catch (error) {
            console.error('Error in sendFriendRequest:', error);
            throw error;
        }
    };

    const acceptFriendRequest = async (requestId: string) => {
        if (!user) throw new Error('Must be logged in to accept friend requests');

        const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
        if (!requestDoc.exists()) throw new Error('Friend request not found');

        const requestData = requestDoc.data() as DocumentData;
        if (requestData.receiverId !== user.uid) throw new Error('Not authorized to accept this request');

        // Create friendship document
        const friendshipId = `${requestData.senderId}_${user.uid}`;
        await setDoc(doc(db, 'friendships', friendshipId), {
            userIds: [requestData.senderId, user.uid],
            createdAt: serverTimestamp()
        });

        // Create a notification for the request sender
        try {
            // Import dynamically to avoid circular dependencies
            const { createFriendAcceptNotification } = await import('@/app/lib/notification');
            
            await createFriendAcceptNotification(
                requestData.senderId,
                user.uid,
                user.displayName || null,
                user.photoURL || null
            );
        } catch (notificationError) {
            console.error('Error creating friend accept notification:', notificationError);
            // Continue even if notification creation fails
        }

        // Update request status
        await deleteDoc(doc(db, 'friendRequests', requestId));
    };

    const rejectFriendRequest = async (requestId: string) => {
        if (!user) throw new Error('Must be logged in to reject friend requests');

        const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
        if (!requestDoc.exists()) throw new Error('Friend request not found');

        const requestData = requestDoc.data() as DocumentData;
        // Allow both sender and receiver to reject/cancel the request
        if (requestData.senderId !== user.uid && requestData.receiverId !== user.uid) {
            throw new Error('Not authorized to reject this request');
        }

        // Delete the request
        await deleteDoc(doc(db, 'friendRequests', requestId));
    };

    const cancelFriendRequest = async (requestId: string) => {
        try {
            // Check if user is authenticated
            if (!user) throw new Error('User not authenticated');

            // Get the request to verify it belongs to the current user
            const requestRef = doc(db, 'friendRequests', requestId);
            const requestDoc = await getDoc(requestRef);
            
            if (!requestDoc.exists()) {
                throw new Error('Friend request not found');
            }
            
            const requestData = requestDoc.data();
            
            // Verify this user is the sender
            if (requestData.senderId !== user.uid) {
                throw new Error('Not authorized to cancel this request');
            }
            
            // Delete the request
            await deleteDoc(requestRef);
            
            // Remove from local state
            setOutgoingRequests(prev => prev.filter(req => req.id !== requestId));
            
            return;
        } catch (error) {
            console.error('Error canceling friend request:', error);
            throw error;
        }
    };

    const removeFriend = async (friendId: string) => {
        if (!user) throw new Error('Must be logged in to remove friends');

        // Delete friendship document (try both possible IDs)
        const friendshipId1 = `${user.uid}_${friendId}`;
        const friendshipId2 = `${friendId}_${user.uid}`;

        const doc1 = doc(db, 'friendships', friendshipId1);
        const doc2 = doc(db, 'friendships', friendshipId2);

        const [snapshot1, snapshot2] = await Promise.all([
            getDoc(doc1),
            getDoc(doc2)
        ]);

        if (snapshot1.exists()) {
            await deleteDoc(doc1);
        } else if (snapshot2.exists()) {
            await deleteDoc(doc2);
        }
    };

    const shareRecipeWithFriend = async (recipeId: string, recipeName: string, recipeImageUrl: string | undefined, friendId: string) => {
        if (!user) throw new Error('Must be logged in to share recipes');

        try {
            // Create a simplified recipe share document
            const sharedRecipeData = {
                recipeId,
                recipeName,
                recipeImageUrl,
                senderId: user.uid,
                senderName: user.displayName || 'A friend',
                receiverId: friendId,
                status: 'pending',
                createdAt: serverTimestamp()
            };
            
            // Add the document
            const sharedRecipeRef = await addDoc(collection(db, 'sharedRecipes'), sharedRecipeData);
            
            // Create a notification for the recipient
            try {
                // Import dynamically to avoid circular dependencies
                const { createRecipeShareNotification } = await import('@/app/lib/notification');
                
                await createRecipeShareNotification(
                    friendId,
                    user.uid,
                    user.displayName || null,
                    user.photoURL || null,
                    recipeId,
                    recipeName,
                    sharedRecipeRef.id // Pass the shared recipe ID
                );
            } catch (notificationError) {
                console.error('Error creating recipe share notification:', notificationError);
                // Continue even if notification creation fails
            }
            
            return;
        } catch (error) {
            console.error('Error sharing recipe:', error);
            
            // Provide more specific error message
            if (error instanceof Error) {
                throw new Error(`Error sharing recipe: ${error.message}`);
            } else {
                throw new Error('Unknown error sharing recipe');
            }
        }
    };

    const acceptSharedRecipe = async (sharedRecipeId: string) => {
        if (!user) throw new Error('Must be logged in to accept shared recipes');

        try {
            // Get the shared recipe document
            const sharedRecipeDoc = await getDoc(doc(db, 'sharedRecipes', sharedRecipeId));
            if (!sharedRecipeDoc.exists()) throw new Error('Shared recipe not found');

            const sharedRecipeData = sharedRecipeDoc.data() as SharedRecipe;
            if (sharedRecipeData.receiverId !== user.uid) throw new Error('Not authorized to accept this shared recipe');

            // Get the original recipe
            const recipeDoc = await getDoc(doc(db, 'recipes', sharedRecipeData.recipeId));
            if (!recipeDoc.exists()) throw new Error('Original recipe not found');

            const recipeData = recipeDoc.data();

            // Create a copy of the recipe for the current user
            const newRecipeData = {
                ...recipeData,
                userId: user.uid,
                createdAt: serverTimestamp()
            };

            // Remove the id if it exists in the original data
            const typedRecipeData = newRecipeData as Record<string, unknown>;
            if (typedRecipeData.id) delete typedRecipeData.id;

            // Add the recipe to the user's collection
            await addDoc(collection(db, 'recipes'), newRecipeData);

            // Update the shared recipe status
            await updateDoc(doc(db, 'sharedRecipes', sharedRecipeId), {
                status: 'accepted'
            });

            return;
        } catch (error) {
            console.error('Error accepting shared recipe:', error);
            throw error;
        }
    };

    const rejectSharedRecipe = async (sharedRecipeId: string) => {
        if (!user) throw new Error('Must be logged in to reject shared recipes');

        try {
            // Get the shared recipe document
            const sharedRecipeDoc = await getDoc(doc(db, 'sharedRecipes', sharedRecipeId));
            if (!sharedRecipeDoc.exists()) throw new Error('Shared recipe not found');

            const sharedRecipeData = sharedRecipeDoc.data() as SharedRecipe;
            if (sharedRecipeData.receiverId !== user.uid) throw new Error('Not authorized to reject this shared recipe');

            // Update the shared recipe status
            await updateDoc(doc(db, 'sharedRecipes', sharedRecipeId), {
                status: 'rejected'
            });

            return;
        } catch (error) {
            console.error('Error rejecting shared recipe:', error);
            throw error;
        }
    };

    const searchUsers = async (query: string) => {
        if (!user) throw new Error('Must be logged in to search users');
        if (!query.trim()) return [];

        const usersRef = collection(db, 'users');
        const searchTerm = query.toLowerCase();

        // Search by both email and display name simultaneously
        const emailQuery = firestoreQuery(
            usersRef,
            where('email', '>=', searchTerm),
            where('email', '<=', searchTerm + '\uf8ff'),
            limit(10)
        );

        const nameQuery = firestoreQuery(
            usersRef,
            where('displayName', '>=', searchTerm),
            where('displayName', '<=', searchTerm + '\uf8ff'),
            limit(10)
        );

        const [emailSnapshot, nameSnapshot] = await Promise.all([
            getDocs(emailQuery),
            getDocs(nameQuery)
        ]);

        // Get all friend IDs and pending request IDs
        const friendIds = new Set(friends.map(f => f.id));
        const pendingRequestIds = new Set([
            ...incomingRequests.map(r => r.senderId),
            ...outgoingRequests.map(r => r.receiverId)
        ]);

        // Combine and deduplicate results
        const results = new Map<string, UserSearchResult>();

        // Process email results
        emailSnapshot.docs.forEach(doc => {
            const data = doc.data() as { displayName: string; email: string; photoURL: string | null };
            if (doc.id !== user.uid && !friendIds.has(doc.id) && !pendingRequestIds.has(doc.id)) {
                results.set(doc.id, {
                    id: doc.id,
                    displayName: data.displayName,
                    photoURL: data.photoURL
                });
            }
        });

        // Process name results
        nameSnapshot.docs.forEach(doc => {
            const data = doc.data() as { displayName: string; email: string; photoURL: string | null };
            if (doc.id !== user.uid && !friendIds.has(doc.id) && !pendingRequestIds.has(doc.id)) {
                results.set(doc.id, {
                    id: doc.id,
                    displayName: data.displayName,
                    photoURL: data.photoURL
                });
            }
        });

        return Array.from(results.values());
    };

    const value = {
        friends,
        incomingRequests,
        outgoingRequests,
        sharedRecipes,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        removeFriend,
        shareRecipeWithFriend,
        acceptSharedRecipe,
        rejectSharedRecipe,
        loading,
        searchUsers
    };

    return (
        <FriendsContext.Provider value={value}>
            {children}
        </FriendsContext.Provider>
    );
} 