'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiUser, FiSettings, FiBookmark, FiUserPlus, FiUserCheck, FiUserX, FiChevronDown, FiChevronRight, FiBell, FiTag, FiX } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { useFriends } from '@/app/context/FriendsContext';
import AddFriend from '@/app/components/AddFriend';
import { getUserProfile, getUserRelationship, followUser, unfollowUser, getFollowingList, updateUserProfile } from '@/app/lib/user';
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
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Check if this is the current user's profile
  const isOwnProfile = user?.uid === id;
  
  // Set active tab from URL parameter and handle auto-scrolling
  useEffect(() => {
    if (tabParam && ['recipes', 'friends', 'following', 'notifications'].includes(tabParam)) {
      // Only set the tab if it's valid and (for restricted tabs) if the user is viewing their own profile
      if (tabParam === 'notifications' || tabParam === 'following') {
        if (isOwnProfile) {
          setActiveTab(tabParam);
          
          if (tabParam === 'notifications') {
            // Use setTimeout to ensure the tab content is rendered before scrolling
            setTimeout(() => {
              if (notificationsRef.current) {
                const headerOffset = 80; // Account for header height
                const elementPosition = notificationsRef.current.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth"
                });
              }
            }, 300);
          }
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
        let profileData = null;
        try {
          profileData = await getUserProfile(id as string);
          if (profileData) {
            setProfile(profileData as UserProfile);
            profileData = profileData as UserProfile;
          }
        } catch (profileError) {
          console.error('Error loading user profile:', profileError);
        }
        
        if (profileData) {
          const isOwnProfile = user?.uid === id;
          
          if (!isOwnProfile && (profileData as UserProfile).profileVisibility === 'private') {
            if (!user) {
              setProfile(null);
              setLoading(false);
              return;
            } else {
              const relationshipData = await getUserRelationship(user.uid, id as string);
              if (!relationshipData.isFriend) {
                setProfile(null);
                setLoading(false);
                return;
              }
            }
          }
          
          // Public profile - continue loading, but adapt what we show for non-authenticated users
          const currentUserId = user?.uid;
          
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
            const result = await getUserRecipes(id as string, 6, undefined, currentUserId);
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
        if (user && id !== user.uid && profile) {
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
      const result = await getUserRecipes(id as string, 6, lastVisible, user?.uid);
      
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
        console.warn("Follow action couldn't be completed due to permissions");
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };
  
  const handleSendFriendRequest = async () => {
    if (!user || !id) return;
    
    try {
      try {
        await sendFriendRequest(id as string);
        // Show success message
        toast.success('Friend request sent');
        
        // Update UI optimistically to show request as pending
        if (relationship) {
          setRelationship({ ...relationship, isPendingFriend: true });
        }
      } catch (requestError) {
        console.error('Error sending friend request:', requestError);
        
        // Show specific error message based on error type
        if (requestError instanceof Error) {
          const errorMessage = requestError.message;
          
          if (errorMessage === 'Friend request already sent') {
            toast.success('Friend request already sent');
            // Update UI to show as pending
            if (relationship) {
              setRelationship({ ...relationship, isPendingFriend: true });
            }
          } else if (errorMessage === 'Already friends with this user') {
            toast.success('You are already friends with this user');
            // Update relationship to reflect they're already friends
            if (relationship) {
              setRelationship({ ...relationship, isFriend: true });
            }
          } else if (errorMessage === 'This user has already sent you a friend request') {
            toast.success('This user has already sent you a friend request. Check your notifications to accept it.');
          } else if (errorMessage === 'You cannot send a friend request to yourself') {
            toast.error('You cannot send a friend request to yourself');
          } else {
            toast.error(errorMessage || 'Failed to send friend request');
          }
        } else {
          toast.error('Failed to send friend request');
        }
      }
    } catch (error) {
      console.error('Error in handleSendFriendRequest:', error);
      toast.error('An unexpected error occurred');
    }
  };
  
  // Add scroll handler to update indicator visibility
  const handleTabsScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5); // 5px buffer
    }
  };
  
  // Initialize scroll indicators on component mount
  useEffect(() => {
    const tabsContainer = tabsContainerRef.current;
    if (tabsContainer) {
      handleTabsScroll();
      tabsContainer.addEventListener('scroll', handleTabsScroll);
      
      // Handle window resize
      const handleResize = () => handleTabsScroll();
      window.addEventListener('resize', handleResize);
      
      return () => {
        tabsContainer.removeEventListener('scroll', handleTabsScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);
  
  // Update scroll indicators when tabs change
  useEffect(() => {
    handleTabsScroll();
  }, [activeTab]);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !profile || !user) return;
    const updated = [...new Set([...(profile.customCategories || []), newCategory.trim()])];
    setProfile(prev => prev ? { ...prev, customCategories: updated } : prev);
    setNewCategory('');
    try {
      await updateUserProfile(user.uid, { customCategories: updated });
    } catch {
      toast.error('Failed to save category');
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    if (!profile || !user) return;
    const updated = (profile.customCategories || []).filter(c => c !== cat);
    setProfile(prev => prev ? { ...prev, customCategories: updated } : prev);
    try {
      await updateUserProfile(user.uid, { customCategories: updated });
    } catch {
      toast.error('Failed to remove category');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-light-green"></div>
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
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Banner */}
              <div className="h-24 bg-cast-iron" />

              {/* Avatar + info */}
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-3">
                  <div className="h-20 w-20 rounded-full border-4 border-white overflow-hidden shadow-sm bg-white">
                    {profile.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt={profile.displayName || 'User'}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-light-green">
                        <FiUser className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-cast-iron">{profile.displayName || 'User'}</h1>
                  {isOwnProfile && <UserTierBadge tier={profile.tier} />}
                </div>

                {profile.bio && (
                  <p className="text-sm text-steel mt-1 mb-4">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100 my-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-cast-iron">{userStats.recipeCount}</p>
                    <p className="text-xs text-steel/60 mt-0.5">Recipes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-cast-iron">{userStats.friendCount}</p>
                    <p className="text-xs text-steel/60 mt-0.5">Friends</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-cast-iron">{userStats.followerCount}</p>
                    <p className="text-xs text-steel/60 mt-0.5">Followers</p>
                  </div>
                </div>

                <p className="text-xs text-steel/40 mb-4">
                  Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                </p>

                {/* Actions */}
                <div className="space-y-2">
                  {isOwnProfile ? (
                    <Button variant="secondary" className="w-full flex items-center justify-center gap-2" href="/profile/edit">
                      <FiSettings size={15} />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      {relationship && !relationship.isFriend && !relationship.isPendingFriend && (
                        <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={handleSendFriendRequest}>
                          <FiUserPlus size={15} />
                          Add Friend
                        </Button>
                      )}
                      {relationship && relationship.isPendingFriend && (
                        <Button variant="secondary" className="w-full flex items-center justify-center gap-2" disabled>
                          <FiUserCheck size={15} />
                          Request Sent
                        </Button>
                      )}
                      {relationship && (
                        <Button
                          variant={relationship.isFollowing ? 'outline' : 'secondary'}
                          className="w-full flex items-center justify-center gap-2"
                          onClick={handleFollow}
                        >
                          {relationship.isFollowing ? (
                            <><FiUserX size={15} /> Unfollow</>
                          ) : (
                            <><FiUserPlus size={15} /> Follow</>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Tabs */}
              <div className="border-b border-gray-100 relative">
                <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 flex items-center pointer-events-none md:hidden transition-opacity duration-200 ${showLeftScroll ? 'opacity-100' : 'opacity-0'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-steel ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>

                <nav ref={tabsContainerRef} className="flex overflow-x-auto px-5 hide-scrollbar">
                  {([
                    { id: 'recipes',       label: 'Recipes',      icon: FiBookmark, badge: 0,                      show: true },
                    { id: 'categories',    label: 'Categories',   icon: FiTag,      badge: 0,                      show: isOwnProfile },
                    { id: 'friends',       label: `Friends${userStats.friendCount > 0 ? ` (${userStats.friendCount})` : ''}`,     icon: FiUser,     badge: 0, show: isOwnProfile || (profile as UserProfile).friendsVisibility === 'public' || !!(relationship?.isFriend) },
                    { id: 'following',     label: `Following${userStats.followingCount > 0 ? ` (${userStats.followingCount})` : ''}`, icon: FiUser, badge: 0, show: isOwnProfile },
                    { id: 'notifications', label: 'Notifications', icon: FiBell,     badge: unreadNotificationCount, show: isOwnProfile },
                  ] as { id: string; label: string; icon: React.ElementType; badge: number; show: boolean }[])
                    .filter(t => t.show)
                    .map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id)}
                          className={`flex items-center gap-1.5 py-4 px-3 mr-1 border-b-2 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                            activeTab === t.id
                              ? 'border-light-green text-light-green'
                              : 'border-transparent text-steel hover:text-cast-iron hover:border-gray-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {t.label}
                          {t.badge > 0 && (
                            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-light-green rounded-full">
                              {t.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </nav>

                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 flex items-center justify-end pointer-events-none md:hidden transition-opacity duration-200 ${showRightScroll ? 'opacity-100' : 'opacity-0'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-steel mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Tab content */}
              <div className="p-6">

                {/* Recipes */}
                {activeTab === 'recipes' && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-4xl block mb-4">🍽️</span>
                    <h3 className="text-base font-bold text-cast-iron mb-1">
                      {isOwnProfile
                        ? `You have ${userStats.recipeCount} recipe${userStats.recipeCount !== 1 ? 's' : ''}`
                        : `${profile.displayName || 'This user'} has ${userStats.recipeCount} recipe${userStats.recipeCount !== 1 ? 's' : ''}`}
                    </h3>
                    <p className="text-sm text-steel mb-6">
                      {isOwnProfile ? 'Search, filter, and browse your collection.' : 'Browse their collection with search and filters.'}
                    </p>
                    <Button
                      variant="secondary"
                      href={isOwnProfile ? '/recipes' : `/profile/${id}/recipes`}
                      className="flex items-center gap-2"
                    >
                      {isOwnProfile ? 'Go to My Recipes' : `Browse ${profile.displayName || 'their'} recipes`}
                      <FiChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Friends */}
                {activeTab === 'friends' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {((isOwnProfile && friends.length > 0) ||
                        ((profile as UserProfile).friendsVisibility === 'public' && friends.length > 0) ||
                        (relationship?.isFriend && friends.length > 0)) ? (
                        friends.map(friend => (
                          <div key={friend.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-light-green/10 flex-shrink-0 flex items-center justify-center">
                              {friend.photoURL ? (
                                <Image src={friend.photoURL} alt={friend.displayName || 'Friend'} width={40} height={40} className="h-full w-full object-cover" />
                              ) : (
                                <FiUser className="h-5 w-5 text-light-green" />
                              )}
                            </div>
                            <p className="flex-1 text-sm font-medium text-cast-iron truncate">{friend.displayName || 'User'}</p>
                            <Button variant="outline" size="sm" href={`/profile/${friend.id}`} className="text-xs flex-shrink-0">View</Button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-12">
                          <p className="text-sm text-steel">
                            {(profile as UserProfile).friendsVisibility === 'private' && !isOwnProfile && !relationship?.isFriend
                              ? "This user's friends list is private."
                              : 'No friends to display.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {isOwnProfile && outgoingRequests.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-cast-iron mb-3">Pending Requests</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {outgoingRequests.map(request => (
                            <div key={request.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-light-green/10 flex-shrink-0 flex items-center justify-center">
                                {request.receiverPhotoURL ? (
                                  <Image src={request.receiverPhotoURL} alt={request.receiverName || 'User'} width={40} height={40} className="h-full w-full object-cover" />
                                ) : (
                                  <FiUser className="h-5 w-5 text-light-green" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-cast-iron truncate">{request.receiverName || 'User'}</p>
                                <p className="text-xs text-steel/50">Request pending</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => cancelFriendRequest(request.id)} className="text-xs flex-shrink-0">Cancel</Button>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 mt-6" />
                      </div>
                    )}

                    {isOwnProfile && <AddFriend />}
                  </>
                )}

                {/* Following */}
                {activeTab === 'following' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {followingUsers.length > 0 ? (
                      followingUsers.map(followedUser => (
                        <div key={followedUser.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-light-green/10 flex-shrink-0 flex items-center justify-center">
                            {followedUser.photoURL ? (
                              <Image src={followedUser.photoURL} alt={followedUser.displayName || 'User'} width={40} height={40} className="h-full w-full object-cover" />
                            ) : (
                              <FiUser className="h-5 w-5 text-light-green" />
                            )}
                          </div>
                          <p className="flex-1 text-sm font-medium text-cast-iron truncate">{followedUser.displayName || 'User'}</p>
                          <Button variant="outline" size="sm" href={`/profile/${followedUser.id}`} className="text-xs flex-shrink-0">View</Button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <p className="text-sm text-steel">You aren&apos;t following anyone yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Categories */}
                {activeTab === 'categories' && isOwnProfile && (
                  <div>
                    <p className="text-xs text-steel/50 mb-5">
                      These appear as options when adding or editing recipes.
                    </p>

                    {/* Existing categories */}
                    {(profile.customCategories || []).length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {(profile.customCategories || []).map(cat => (
                          <div
                            key={cat}
                            className="flex items-center gap-1.5 bg-light-green/10 text-light-green border border-light-green/20 rounded-full px-3 py-1.5 text-sm font-medium"
                          >
                            {cat}
                            <button
                              onClick={() => handleRemoveCategory(cat)}
                              className="hover:text-green transition-colors"
                              aria-label={`Remove ${cat}`}
                            >
                              <FiX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-steel mb-5">No custom categories yet.</p>
                    )}

                    {/* Add new */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                        placeholder="New category name..."
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                      />
                      <Button variant="primary" size="sm" onClick={handleAddCategory}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {activeTab === 'notifications' && (
                  <div ref={notificationsRef}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-cast-iron">Notifications</h3>
                      {notifications.length > 0 && unreadNotificationCount > 0 && (
                        <button
                          onClick={async () => {
                            await markAllNotificationsAsRead(user!.uid);
                            setUnreadNotificationCount(0);
                            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                          }}
                          className="text-xs font-medium text-light-green hover:text-green transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                        {notifications.map(notification => (
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
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <FiBell className="w-8 h-8 mx-auto mb-3 text-steel/30" />
                        <p className="text-sm font-medium text-cast-iron mb-1">No notifications</p>
                        <p className="text-xs text-steel">You&apos;re all caught up.</p>
                      </div>
                    )}
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