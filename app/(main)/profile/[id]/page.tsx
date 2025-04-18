'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FiUser, FiSettings, FiUsers, FiBookmark, FiPlusCircle, FiUserPlus, FiUserCheck, FiUserX, FiChevronDown, FiBell } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { useFriends } from '@/app/context/FriendsContext';
import AddFriend from '@/app/components/AddFriend';
import { getUserProfile, getUserRelationship, followUser, unfollowUser, getFollowingList } from '@/app/lib/user';
import { getUserRecipes, getUserStats } from '@/app/lib/recipe';
import { getUserNotifications, getUnreadNotificationCount, markAllNotificationsAsRead } from '@/app/lib/notification';
import { UserProfile, UserRelationship, UserStats, Notification } from '@/app/models/User';
import { Recipe } from '@/app/models/Recipe';
import UserTierBadge from '@/app/components/UserTierBadge';
import Button from '@/app/components/Button';
import NotificationItem from '@/app/components/NotificationItem';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user } = useAuth();
  const { sendFriendRequest, friends, outgoingRequests, cancelFriendRequest } = useFriends();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    recipeCount: 0,
    friendCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [followingUsers, setFollowingUsers] = useState<{id: string, displayName: string | null, photoURL: string | null}[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [loadingMoreRecipes, setLoadingMoreRecipes] = useState(false);
  const [relationship, setRelationship] = useState<UserRelationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recipes');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Check if this is the current user's profile
  const isOwnProfile = user?.uid === id;
  
  // Set active tab from URL parameter
  useEffect(() => {
    if (tabParam && ['recipes', 'friends', 'following', 'notifications'].includes(tabParam)) {
      // Only set the tab if it's valid and (for restricted tabs) if the user is viewing their own profile
      if (tabParam === 'notifications' || tabParam === 'following') {
        if (isOwnProfile) {
          setActiveTab(tabParam);
        }
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam, isOwnProfile]);
  
  useEffect(() => {
    const loadProfileData = async () => {
      if (!id) return;
      
      setLoading(true);
      // Reset pagination state when profile changes
      setRecipes([]);
      setLastVisible(null);
      setHasMoreRecipes(true);
      setFollowingUsers([]);
      setNotifications([]);
      setUnreadNotificationCount(0);
      
      try {
        // Load user profile data
        let profileData = null;
        try {
          profileData = await getUserProfile(id as string);
          if (profileData) {
            setProfile(profileData as UserProfile);
          }
        } catch (profileError) {
          console.error('Error loading user profile:', profileError);
          // If we can't load the profile, we'll show the "User Not Found" UI
        }
        
        if (profileData) {
          // Load user stats - continue if this fails
          try {
            const stats = await getUserStats(id as string);
            setUserStats(stats);
          } catch (statsError) {
            console.error('Error loading user stats:', statsError);
            // Continue with default stats
          }
          
          // Load initial batch of user recipes
          try {
            const result = await getUserRecipes(id as string);
            setRecipes(result.recipes);
            setLastVisible(result.lastVisible);
            setHasMoreRecipes(result.recipes.length === 6 && result.lastVisible !== null);
          } catch (recipesError) {
            console.error('Error loading user recipes:', recipesError);
            // Continue with empty recipes array
          }
          
          // If this is the user's own profile, load their following list
          if (isOwnProfile) {
            try {
              const following = await getFollowingList(id as string);
              setFollowingUsers(following);
            } catch (followingError) {
              console.error('Error loading following list:', followingError);
              // Continue with empty following list
              setFollowingUsers([]);
            }
            
            // Load notifications for own profile
            try {
              const userNotifications = await getUserNotifications(id as string);
              setNotifications(userNotifications);
              
              const unreadCount = await getUnreadNotificationCount(id as string);
              setUnreadNotificationCount(unreadCount);
            } catch (notificationsError) {
              console.error('Error loading notifications:', notificationsError);
              // Continue with empty notifications
            }
          }
        }
        
        // If not the user's own profile, load relationship info
        if (!isOwnProfile && user && profileData) {
          try {
            const relationshipData = await getUserRelationship(user.uid, id as string);
            setRelationship(relationshipData);
          } catch (relationshipError) {
            console.error('Error loading relationship data:', relationshipError);
            // Create a default relationship with no permissions
            setRelationship({
              isFriend: false,
              isPendingFriend: false,
              isFollowing: false
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [id, user, isOwnProfile]);
  
  // Function to load more recipes
  const loadMoreRecipes = async () => {
    if (!id || !lastVisible || loadingMoreRecipes || !hasMoreRecipes) return;
    
    setLoadingMoreRecipes(true);
    try {
      const result = await getUserRecipes(id as string, 6, lastVisible);
      
      // Append new recipes to existing ones
      setRecipes(prevRecipes => [...prevRecipes, ...result.recipes]);
      setLastVisible(result.lastVisible);
      
      // Check if we've reached the end
      setHasMoreRecipes(result.recipes.length === 6 && result.lastVisible !== null);
    } catch (error) {
      console.error('Error loading more recipes:', error);
    } finally {
      setLoadingMoreRecipes(false);
    }
  };
  
  const handleFollow = async () => {
    if (!user || !id || !relationship) return;
    
    try {
      let success = false;
      
      if (relationship.isFollowing) {
        // Try to unfollow
        success = await unfollowUser(user.uid, id as string);
        if (success) {
          // Update UI immediately for better user experience
          setRelationship({ ...relationship, isFollowing: false });
          
          // Update following count in stats
          setUserStats(prev => ({
            ...prev,
            followingCount: Math.max(0, prev.followingCount - 1)  // Prevent negative values
          }));
          
          // If we're on our own profile, refresh the following list
          if (user.uid === id) {
            try {
              const following = await getFollowingList(user.uid);
              setFollowingUsers(following);
            } catch (error) {
              console.error('Error refreshing following list:', error);
            }
          }
        }
      } else {
        // Try to follow
        success = await followUser(user.uid, id as string);
        if (success) {
          // Update UI immediately for better user experience
          setRelationship({ ...relationship, isFollowing: true });
          
          // Update following count in stats
          setUserStats(prev => ({
            ...prev,
            followingCount: prev.followingCount + 1
          }));
          
          // If we're on our own profile, refresh the following list
          if (user.uid === id) {
            try {
              const following = await getFollowingList(user.uid);
              setFollowingUsers(following);
            } catch (error) {
              console.error('Error refreshing following list:', error);
            }
          }
        }
      }
      
      if (!success) {
        // Show a minimal local toast or message
        console.warn("Follow action couldn't be completed due to permissions");
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      // Don't update UI state if the operation failed
    }
  };
  
  const handleSendFriendRequest = async () => {
    if (!user || !id) return;
    
    try {
      try {
        await sendFriendRequest(id as string);
        // Show success message
        toast.success('Friend request sent');
      } catch (requestError) {
        console.error('Error sending friend request:', requestError);
        
        // Show specific error message based on error type
        if (requestError instanceof Error) {
          if (requestError.message === 'Friend request already sent') {
            toast.error('Friend request already sent');
            // Still update UI to show as pending
          } else if (requestError.message === 'Already friends with this user') {
            toast.error('Already friends with this user');
            // Update relationship to reflect they're already friends
            if (relationship) {
              setRelationship({ ...relationship, isFriend: true });
            }
            return; // Exit early as we don't want to mark as pending
          } else {
            toast.error(requestError.message || 'Failed to send friend request');
          }
        } else {
          toast.error('Failed to send friend request');
        }
      }
      
      // Update UI optimistically to show request as pending
      if (relationship) {
        setRelationship({ ...relationship, isPendingFriend: true });
      }
    } catch (error) {
      console.error('Error in handleSendFriendRequest:', error);
      toast.error('An unexpected error occurred');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-basil"></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
        <p className="text-gray-600">This user doesn&apos;t exist or their profile is private.</p>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-gray-50 min-h-screen pt-6 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - User Info */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-[var(--header-height)]">
              {/* Profile Header with Banner */}
              <div className="w-full h-32 inset-0 bg-[url('/images/bg_ingredients.png')] bg-repeat relative bg-[length:300px_300px]">
              <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/80"></div>
                {profile.photoURL ? (
                  <div className="absolute left-6 -bottom-12 h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-white shadow z-10">
                    <Image 
                      src={profile.photoURL} 
                      alt={profile.displayName || 'User'} 
                      width={96} 
                      height={96}
                      className="h-full w-full object-cover"
                      sizes="(max-width: 768px) 150px, 150px"
                    />
                  </div>
                ) : (
                  <div className="absolute left-6 -bottom-12 h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-white shadow">
                    <div className="h-full w-full flex items-center justify-center bg-basil">
                      <FiUser className="h-12 w-12 text-basil" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="px-6 pt-16 pb-6">
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.displayName || 'User'}
                  </h1>
                  {isOwnProfile && (
                    <UserTierBadge tier={profile.tier} className="ml-1" />
                  )}
                </div>
                
                {profile.bio && (
                  <p className="mt-3 text-gray-600 text-sm">{profile.bio}</p>
                )}
                
                <div className="mt-6 space-y-3">
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Recipes</span>
                    <span className="text-gray-900 font-medium text-sm">{userStats.recipeCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Friends</span>
                    <span className="text-gray-900 font-medium text-sm">{userStats.friendCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Followers</span>
                    <span className="text-gray-900 font-medium text-sm">{userStats.followerCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500 text-sm">Member Since</span>
                    <span className="text-gray-900 font-medium text-sm">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  {isOwnProfile ? (
                    <Button 
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2"
                      href="/profile/edit"
                    >
                      <FiSettings size={16} />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      {relationship && !relationship.isFriend && !relationship.isPendingFriend && (
                        <Button 
                          variant="primary" 
                          className="w-full flex items-center justify-center gap-2"
                          onClick={handleSendFriendRequest}
                        >
                          <FiUserPlus size={16} />
                          Add Friend
                        </Button>
                      )}
                      
                      {relationship && relationship.isPendingFriend && (
                        <Button 
                          variant="primary" 
                          className="w-full flex items-center justify-center gap-2"
                          disabled
                        >
                          <FiUserCheck size={16} />
                          Request Sent
                        </Button>
                      )}
                      
                      {relationship && (
                        <Button 
                          variant={relationship.isFollowing ? "outline" : "primary"}
                          className="w-full flex items-center justify-center gap-2"
                          onClick={handleFollow}
                        >
                          {relationship.isFollowing ? (
                            <>
                              <FiUserX size={16} />
                              Unfollow
                            </>
                          ) : (
                            <>
                              <FiUserPlus size={16} />
                              Follow
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Content Area */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Tabs Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex overflow-x-auto whitespace-nowrap px-4 sm:px-6 hide-scrollbar">
                  <button
                    onClick={() => setActiveTab('recipes')}
                    className={`py-4 px-3 border-b-2 font-medium text-sm flex-shrink-0 ${
                      activeTab === 'recipes'
                        ? 'border-basil text-basil'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center">
                      <FiBookmark className="mr-2" />
                      Recipes
                    </span>
                  </button>
                  
                  {(isOwnProfile || profile.friendsVisibility === 'public') && (
                    <button
                      onClick={() => setActiveTab('friends')}
                      className={`py-4 px-3 border-b-2 font-medium text-sm ml-4 flex-shrink-0 ${
                        activeTab === 'friends'
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center">
                        <FiUsers className="mr-2" />
                        Friends
                      </span>
                    </button>
                  )}
                  
                  {/* Only show Following tab on user's own profile - it needs special permissions */}
                  {isOwnProfile && (
                    <button
                      onClick={() => setActiveTab('following')}
                      className={`py-4 px-3 border-b-2 font-medium text-sm ml-4 flex-shrink-0 ${
                        activeTab === 'following'
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center">
                        <FiUser className="mr-2" />
                        Following {userStats.followingCount > 0 && `(${userStats.followingCount})`}
                      </span>
                    </button>
                  )}
                  
                  {/* Notifications tab - only visible for the user's own profile */}
                  {isOwnProfile && (
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`py-4 px-3 border-b-2 font-medium text-sm ml-4 flex-shrink-0 ${
                        activeTab === 'notifications'
                          ? 'border-basil text-basil'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex items-center">
                        <FiBell className="mr-2" />
                        Notifications
                        {unreadNotificationCount > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-basil rounded-full">
                            {unreadNotificationCount}
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                </nav>
              </div>
              
              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'recipes' && (
                  <div className="flex flex-col space-y-4">
                    {recipes.length > 0 ? (
                      <>
                        {recipes.map(recipe => (
                          <div key={recipe.id} className="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:scale-[1.01]">
                            <div className="flex items-center">
                              <div className="h-16 w-16 bg-gray-200 relative flex-shrink-0">
                                {recipe.imageUrl ? (
                                  <Image 
                                    src={recipe.imageUrl} 
                                    alt={recipe.name} 
                                    fill 
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <Image 
                                    src="/images/bg_ingredients.png" 
                                    alt="Default recipe background"
                                    fill 
                                    sizes="64px"
                                    className="object-cover opacity-75"
                                  />
                                )}
                              </div>
                              <div className="px-4 py-3 flex-grow flex items-center justify-between">
                                <h3 className="text-base font-medium text-gray-900 truncate">{recipe.name}</h3>
                                <Button 
                                  variant="outline" 
                                  className="text-sm"
                                  href={`/recipes/${recipe.id}`}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Load more button */}
                        {hasMoreRecipes && (
                          <div className="flex justify-center mt-4">
                            <Button 
                              variant="outline" 
                              className="flex items-center gap-2"
                              onClick={loadMoreRecipes}
                              disabled={loadingMoreRecipes}
                            >
                              {loadingMoreRecipes ? (
                                <>
                                  <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <FiChevronDown size={16} />
                                  Load More Recipes
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        {isOwnProfile ? (
                          <div className="flex flex-col items-center">
                            <FiPlusCircle className="w-12 h-12 mb-4 text-emerald-400" />
                            <h3 className="text-lg font-medium mb-2">No recipes yet</h3>
                            <p className="mb-4 text-sm text-gray-500">Start building your collection by adding your first recipe</p>
                            <Button variant="primary" href="/add-recipe">Add Recipe</Button>
                          </div>
                        ) : (
                          <p>This user hasn&apos;t added any recipes yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'friends' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {isOwnProfile && friends.length > 0 ? (
                        <>
                          {friends.map(friend => (
                            <div key={friend.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100">
                              <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 mr-4">
                                {friend.photoURL ? (
                                  <Image 
                                    src={friend.photoURL} 
                                    alt={friend.displayName || 'Friend'}
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-emerald-100">
                                    <FiUser className="h-6 w-6 text-emerald-500" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{friend.displayName || 'User'}</h4>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                href={`/profile/${friend.id}`}
                                className="text-xs"
                              >
                                View
                              </Button>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-12 col-span-full text-gray-500">
                          <p>No friends to display.</p>
                        </div>
                      )}
                    </div>
                    
                    {isOwnProfile && outgoingRequests.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Requests</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {outgoingRequests.map(request => (
                            <div key={request.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100">
                              <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 mr-4">
                                {request.receiverPhotoURL ? (
                                  <Image 
                                    src={request.receiverPhotoURL} 
                                    alt={request.receiverName || 'User'}
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-emerald-100">
                                    <FiUser className="h-6 w-6 text-emerald-500" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{request.receiverName || 'User'}</h4>
                                <p className="text-sm text-gray-500">Request pending</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelFriendRequest(request.id)}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ))}
                        </div>
                        <hr className="border-gray-200 mt-8" />
                      </div>
                    )}
                    
                    <AddFriend />
                  </>
                )}
                
                {activeTab === 'following' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {followingUsers.length > 0 ? (
                      followingUsers.map(followedUser => (
                        <div key={followedUser.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-100">
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 mr-4">
                            {followedUser.photoURL ? (
                              <Image 
                                src={followedUser.photoURL} 
                                alt={followedUser.displayName || 'User'}
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-emerald-100">
                                <FiUser className="h-6 w-6 text-emerald-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{followedUser.displayName || 'User'}</h4>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            href={`/profile/${followedUser.id}`}
                            className="text-xs"
                          >
                            View
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 col-span-full text-gray-500">
                        <p>You aren&apos;t following anyone yet.</p>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'notifications' && (
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                      {notifications.length > 0 && unreadNotificationCount > 0 && (
                        <button
                          onClick={async () => {
                            await markAllNotificationsAsRead(user!.uid);
                            setUnreadNotificationCount(0);
                            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                          }}
                          className="text-sm text-emerald-600 hover:text-emerald-800"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                      {notifications.length > 0 ? (
                        notifications.map(notification => (
                          <NotificationItem 
                            key={notification.id}
                            notification={notification}
                            onDelete={(id) => {
                              setNotifications(notifications.filter(n => n.id !== id));
                              if (!notification.isRead) {
                                setUnreadNotificationCount(prev => Math.max(0, prev - 1));
                              }
                            }}
                          />
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FiBell className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium mb-1">No notifications</p>
                          <p className="text-sm">You&apos;re all caught up! Notifications will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}