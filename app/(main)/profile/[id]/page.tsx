'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FiUser, FiSettings, FiUserPlus, FiUserCheck, FiBell, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import RecipeCard from '@/app/components/RecipeCard';
import { useAuth } from '@/app/context/AuthContext';
import { useFriends } from '@/app/context/FriendsContext';
import AddFriend from '@/app/components/AddFriend';
import { getUserProfile, getUserRelationship, updateUserProfile, getProfileFriends, ProfileFriend } from '@/app/lib/user';
import { getUserRecipes, getUserStats } from '@/app/lib/recipe';
import { getUserNotifications, getUnreadNotificationCount, markAllNotificationsAsRead } from '@/app/lib/notification';
import { UserProfile, UserRelationship, UserStats, Notification } from '@/app/models/User';
import { Recipe } from '@/app/models/Recipe';
import UserTierBadge from '@/app/components/UserTierBadge';
import Button from '@/app/components/Button';
import NotificationItem from '@/app/components/NotificationItem';
import UpgradeModal from '@/app/components/UpgradeModal';
import ConfirmModal from '@/app/components/ConfirmModal';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user, userProfile } = useAuth();
  const { sendFriendRequest, friends, outgoingRequests, cancelFriendRequest, removeFriend } = useFriends();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    recipeCount: 0,
    friendCount: 0,
    followerCount: 0,
    followingCount: 0,
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [loadingMoreRecipes, setLoadingMoreRecipes] = useState(false);
  const [relationship, setRelationship] = useState<UserRelationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recipes');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profileAccessDenied, setProfileAccessDenied] = useState(false);
  const [profileFriends, setProfileFriends] = useState<ProfileFriend[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [categoryToRemove, setCategoryToRemove] = useState<string | null>(null);
  const [isRemovingCategory, setIsRemovingCategory] = useState(false);
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
    if (tabParam && ['recipes', 'friends', 'categories', 'notifications'].includes(tabParam)) {
      if (tabParam === 'notifications' || tabParam === 'categories') {
        if (isOwnProfile) {
          setActiveTab(tabParam);

          if (tabParam === 'notifications') {
            setTimeout(() => {
              if (notificationsRef.current) {
                const headerOffset = 80;
                const elementPosition = notificationsRef.current.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
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
      setNotifications([]);
      setUnreadNotificationCount(0);
      setProfileAccessDenied(false);

      try {
        // Always load the basic profile so we can show name/avatar on the access-denied screen
        let profileData: UserProfile | null = null;
        try {
          const raw = await getUserProfile(id as string);
          if (raw) {
            profileData = raw as UserProfile;
            setProfile(profileData);
          }
        } catch (profileError) {
          console.error('Error loading user profile:', profileError);
        }

        if (!profileData) {
          setLoading(false);
          return;
        }

        const isOwnProfile = user?.uid === id;

        if (!isOwnProfile) {
          // Always require friendship to view another user's profile
          if (!user) {
            setProfileAccessDenied(true);
            setLoading(false);
            return;
          }

          let relationshipData: UserRelationship = { isFriend: false, isPendingFriend: false, isFollowing: false };
          try {
            relationshipData = await getUserRelationship(user.uid, id as string);
          } catch (e) {
            console.error('Error loading relationship:', e);
          }
          setRelationship(relationshipData);

          if (!relationshipData.isFriend) {
            setProfileAccessDenied(true);
            setLoading(false);
            return;
          }
        }

        // Access granted — load full profile data
        const currentUserId = user?.uid;

        try {
          const stats = await getUserStats(id as string);
          setUserStats(stats);
        } catch (statsError) {
          console.error('Error loading user stats:', statsError);
        }

        if (!isOwnProfile) {
          const pf = await getProfileFriends(id as string);
          setProfileFriends(pf);
        }

        try {
          const result = await getUserRecipes(id as string, 6, undefined, currentUserId);
          setRecipes(result.recipes);
          setLastVisible(result.lastVisible);
          setHasMoreRecipes(result.recipes.length === 6 && result.lastVisible !== null);
        } catch (recipesError) {
          console.error('Error loading user recipes:', recipesError);
        }

        if (isOwnProfile) {
          try {
            const userNotifications = await getUserNotifications(id as string);
            setNotifications(userNotifications);
            const unreadCount = await getUnreadNotificationCount(id as string);
            setUnreadNotificationCount(unreadCount);
          } catch (notificationsError) {
            console.error('Error loading notifications:', notificationsError);
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
  
  const handleSendFriendRequest = async () => {
    if (!user || !id) return;
    if (userProfile?.tier === 'Free') {
      setShowUpgradeModal(true);
      return;
    }

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

  const handleConfirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    setIsRemovingFriend(true);
    try {
      await removeFriend(friendToRemove.id);
      toast.success('Friend removed');
      setFriendToRemove(null);
    } catch {
      toast.error('Failed to remove friend');
    } finally {
      setIsRemovingFriend(false);
    }
  };

  const handleConfirmRemoveCategory = async () => {
    if (!categoryToRemove || !profile || !user) return;
    setIsRemovingCategory(true);
    const updated = (profile.customCategories || []).filter(c => c !== categoryToRemove);
    setProfile(prev => prev ? { ...prev, customCategories: updated } : prev);
    try {
      await updateUserProfile(user.uid, { customCategories: updated });
      setCategoryToRemove(null);
    } catch {
      toast.error('Failed to remove category');
      // Revert optimistic update
      setProfile(prev => prev ? { ...prev, customCategories: [...(prev.customCategories || []), categoryToRemove] } : prev);
    } finally {
      setIsRemovingCategory(false);
    }
  };

  
  if (loading) {
    return (
      <div className="min-h-screen bg-eggshell">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <div className="h-28 w-28 rounded-2xl bg-stone-300 animate-pulse ring-4 ring-eggshell flex-shrink-0" />
            <div className="flex-1 sm:pb-1 space-y-2">
              <div className="h-6 bg-stone-200 rounded-full w-40 animate-pulse" />
              <div className="h-4 bg-stone-200 rounded-full w-64 animate-pulse" />
            </div>
          </div>
          <div className="flex items-start gap-6 pb-6">
            <div className="flex-1 h-4 bg-stone-200 rounded-full w-48 animate-pulse mt-1" />
            <div className="flex gap-6 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className="h-2.5 w-12 bg-stone-200 rounded-full animate-pulse" />
                <div className="h-7 w-8 bg-stone-200 rounded-lg animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-2.5 w-12 bg-stone-200 rounded-full animate-pulse" />
                <div className="h-7 w-8 bg-stone-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen bg-eggshell flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 bg-cast-iron/10 rounded-2xl flex items-center justify-center">
          <i className="fa-solid fa-user-slash text-cast-iron text-xl" />
        </div>
        <h1 className="text-2xl font-bold text-cast-iron">User not found</h1>
        <p className="text-steel text-sm">This profile doesn&apos;t exist.</p>
      </div>
    );
  }

  if (profileAccessDenied) {
    return (
      <div className="min-h-screen bg-eggshell flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="h-28 w-28 rounded-2xl overflow-hidden bg-light-green flex-shrink-0 shadow-sm mb-5">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={profile.displayName || 'User'}
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <FiUser className="h-12 w-12 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-cast-iron mb-1">{profile.displayName || 'User'}</h1>
          <div className="flex items-center justify-center gap-1.5 text-steel mb-6">
            <i className="fa-solid fa-lock text-xs" />
            <p className="text-sm">Add {profile.displayName || 'this user'} as a friend to view their profile.</p>
          </div>
          {user ? (
            relationship?.isPendingFriend ? (
              <Button variant="secondary" className="flex items-center gap-2" disabled>
                <FiUserCheck size={15} />
                Request Sent
              </Button>
            ) : (
              <Button variant="secondary" className="flex items-center gap-2" onClick={handleSendFriendRequest}>
                <FiUserPlus size={15} />
                Add Friend
              </Button>
            )
          ) : (
            <Button variant="primary" href="/login">Sign in to connect</Button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="social_features"
      />
      <ConfirmModal
        isOpen={!!friendToRemove}
        onClose={() => setFriendToRemove(null)}
        onConfirm={handleConfirmRemoveFriend}
        title="Remove friend"
        message={`Remove ${friendToRemove?.name ?? 'this friend'}? They won't be notified.`}
        confirmLabel="Remove"
        loading={isRemovingFriend}
      />
      <ConfirmModal
        isOpen={!!categoryToRemove}
        onClose={() => setCategoryToRemove(null)}
        onConfirm={handleConfirmRemoveCategory}
        title="Remove category"
        message={`Remove "${categoryToRemove}" from your categories? Recipes using it won't be affected.`}
        confirmLabel="Remove"
        loading={isRemovingCategory}
      />

      <div className="min-h-screen bg-eggshell">

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl pt-10">
            {/* Avatar + actions row */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 mb-4">
              {/* Avatar */}
              <div className="h-28 w-28 rounded-2xl overflow-hidden bg-light-green flex-shrink-0 shadow-sm">
                {profile.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt={profile.displayName || 'User'}
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <FiUser className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              {/* Name + tier + actions */}
              <div className="flex-1 sm:pb-1 flex flex-col items-center sm:items-start sm:flex-row sm:justify-between gap-3 w-full">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-cast-iron leading-tight">{profile.displayName || 'User'}</h1>
                    {isOwnProfile && <UserTierBadge tier={profile.tier} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOwnProfile ? (
                    <>
                      <Button variant="secondary" className="flex items-center gap-2" href="/profile/edit">
                        <FiSettings size={15} />
                        Edit profile
                      </Button>
                      <Button variant="primary" className="flex items-center gap-1.5" href="/add-recipe">
                        + New recipe
                      </Button>
                    </>
                  ) : (
                    <>
                      {relationship && !relationship.isFriend && !relationship.isPendingFriend && (
                        <Button variant="secondary" className="flex items-center gap-2" onClick={handleSendFriendRequest}>
                          <FiUserPlus size={15} />
                          Add Friend
                        </Button>
                      )}
                      {relationship && relationship.isPendingFriend && (
                        <Button variant="secondary" className="flex items-center gap-2" disabled>
                          <FiUserCheck size={15} />
                          Request Sent
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio + Stats */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-6 pb-6">
              <div className="flex-1 text-center sm:text-left">
                {profile.bio && (
                  <p className="text-steel">{profile.bio}</p>
                )}
              </div>
              <div className="flex gap-6 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-steel/50 uppercase tracking-wider mb-0.5">Recipes</span>
                  <span className="text-2xl font-bold text-cast-iron">{userStats.recipeCount}</span>
                </div>
                {isOwnProfile && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-steel/50 uppercase tracking-wider mb-0.5">Friends</span>
                    <span className="text-2xl font-bold text-cast-iron">{userStats.friendCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="border-b border-stone-200">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="container mx-auto px-4 sm:px-6 max-w-6xl relative"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-eggshell to-transparent z-10 flex items-center pointer-events-none md:hidden transition-opacity duration-200 ${showLeftScroll ? 'opacity-100' : 'opacity-0'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-steel ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>

            <nav ref={tabsContainerRef} className="flex overflow-x-auto hide-scrollbar">
              {([
                { id: 'recipes',       label: 'Recipes',       badge: 0,                      show: true },
                { id: 'categories',    label: 'Categories',    badge: 0,                      show: isOwnProfile },
                { id: 'friends',       label: `Friends${userStats.friendCount > 0 ? ` (${userStats.friendCount})` : ''}`, badge: 0, show: isOwnProfile || (profile as UserProfile).friendsVisibility === 'public' || !!(relationship?.isFriend) },
                { id: 'notifications', label: 'Notifications', badge: unreadNotificationCount, show: isOwnProfile },
              ] as { id: string; label: string; badge: number; show: boolean }[])
                .filter(t => t.show)
                .map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`py-3.5 px-4 mr-1 border-b-2 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 ${
                      activeTab === t.id
                        ? 'border-cast-iron text-cast-iron'
                        : 'border-transparent text-steel hover:text-cast-iron'
                    }`}
                  >
                    {t.label}
                    {t.badge > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 text-[0.6875rem] font-bold text-white bg-light-green rounded-full">
                        {t.badge}
                      </span>
                    )}
                  </button>
                ))}
            </nav>

            <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-eggshell to-transparent z-10 flex items-center justify-end pointer-events-none md:hidden transition-opacity duration-200 ${showRightScroll ? 'opacity-100' : 'opacity-0'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-steel mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Tab content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl"
        >

          {/* Recipes */}
          {activeTab === 'recipes' && (
            recipes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {recipes.map((recipe, i) => (
                    <RecipeCard key={recipe.id} recipe={recipe} priority={i < 4} />
                  ))}
                </div>
                {hasMoreRecipes && (
                  <div className="text-center mt-6">
                    <Button variant="secondary" onClick={loadMoreRecipes} disabled={loadingMoreRecipes}>
                      {loadingMoreRecipes ? 'Loading...' : 'Load more'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-tomato/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-utensils text-tomato" />
                </div>
                <h3 className="text-base font-bold text-cast-iron mb-1">
                  {isOwnProfile ? 'No recipes yet' : `${profile.displayName || 'This user'} hasn't shared any recipes`}
                </h3>
                {isOwnProfile && (
                  <Button variant="secondary" href="/add-recipe" className="mt-4">
                    Add your first recipe
                  </Button>
                )}
              </div>
            )
          )}

          {/* Friends */}
          {activeTab === 'friends' && (
            <>
              {isOwnProfile && userProfile?.tier === 'Free' ? (
                userProfile?.subscriptionLapsedAt ? (
                  <div className="text-center py-14">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
                      <FiUserPlus className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-base font-bold text-cast-iron mb-2">Your friends are waiting</h3>
                    {userStats.friendCount > 0 && (
                      <p className="text-sm text-steel max-w-xs mx-auto mb-1">
                        You had {userStats.friendCount} {userStats.friendCount === 1 ? 'friend' : 'friends'} while on Pro.
                      </p>
                    )}
                    <p className="text-sm text-steel max-w-xs mx-auto mb-6">
                      Reactivate Pro to reconnect and keep sharing recipes.
                    </p>
                    <Button variant="primary" onClick={() => setShowUpgradeModal(true)}>
                      Reactivate Pro
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-14">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-light-green/10 mb-4">
                      <FiUserPlus className="w-6 h-6 text-light-green" />
                    </div>
                    <h3 className="text-base font-bold text-cast-iron mb-2">Friends is a Pro feature</h3>
                    <p className="text-sm text-steel max-w-xs mx-auto mb-6">
                      Add friends, share recipes, and browse each other&apos;s collections on Pro.
                    </p>
                    <Button variant="primary" onClick={() => setShowUpgradeModal(true)}>
                      Upgrade to Pro
                    </Button>
                  </div>
                )
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {(() => {
                      const displayFriends = isOwnProfile ? friends : profileFriends;
                      const canSeeFriends = isOwnProfile ||
                        (profile as UserProfile).friendsVisibility === 'public' ||
                        !!relationship?.isFriend;
                      if (canSeeFriends && displayFriends.length > 0) {
                        return displayFriends.map(friend => (
                          <div key={friend.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-stone-100 hover:border-stone-200 transition-colors">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-light-green/10 flex-shrink-0 flex items-center justify-center">
                              {friend.photoURL ? (
                                <Image src={friend.photoURL} alt={friend.displayName || 'Friend'} width={40} height={40} className="h-full w-full object-cover" />
                              ) : (
                                <FiUser className="h-5 w-5 text-light-green" />
                              )}
                            </div>
                            <p className="flex-1 text-sm font-medium text-cast-iron truncate">{friend.displayName || 'User'}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isOwnProfile ? (
                                <>
                                  <Button variant="outline" size="sm" href={`/profile/${friend.id}`} className="text-xs">View</Button>
                                  <button
                                    onClick={() => setFriendToRemove({ id: friend.id, name: friend.displayName || 'this friend' })}
                                    className="text-xs font-medium text-steel/50 hover:text-tomato transition-colors px-2 py-1"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : friend.id === user?.uid ? null : (
                                friends.some(f => f.id === friend.id) ? (
                                  <span className="text-xs font-medium text-steel/50 px-2 py-1">Friends</span>
                                ) : sentRequestIds.has(friend.id) || outgoingRequests.some(r => r.receiverId === friend.id) ? (
                                  <Button variant="outline" size="sm" className="text-xs" disabled>
                                    <FiUserCheck size={12} className="mr-1" />Sent
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs flex items-center gap-1"
                                    onClick={async () => {
                                      if (userProfile?.tier === 'Free') { setShowUpgradeModal(true); return; }
                                      try {
                                        await sendFriendRequest(friend.id);
                                        setSentRequestIds(prev => new Set([...prev, friend.id]));
                                        toast.success('Friend request sent');
                                      } catch {
                                        toast.error('Failed to send friend request');
                                      }
                                    }}
                                  >
                                    <FiUserPlus size={12} />Add Friend
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        ));
                      }
                      return (
                        <div className="col-span-full text-center py-12">
                          <p className="text-sm text-steel">
                            {(profile as UserProfile).friendsVisibility === 'private' && !isOwnProfile && !relationship?.isFriend
                              ? "This user's friends list is private."
                              : 'No friends to display.'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {isOwnProfile && outgoingRequests.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-cast-iron mb-3">Pending Requests</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {outgoingRequests.map(request => (
                          <div key={request.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-stone-100">
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
                      <div className="border-t border-stone-200 mt-6" />
                    </div>
                  )}

                  {isOwnProfile && <AddFriend />}
                </>
              )}
            </>
          )}

          {/* Categories */}
          {activeTab === 'categories' && isOwnProfile && (
            <div>
              <p className="text-xs text-steel/50 mb-5">
                These appear as options when adding or editing recipes.
              </p>
              {(profile.customCategories || []).length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-5">
                  {(profile.customCategories || []).map(cat => (
                    <div
                      key={cat}
                      className="flex items-center gap-1.5 bg-light-green/10 text-light-green border border-light-green/20 rounded-full px-3 py-1.5 text-sm font-medium"
                    >
                      {cat}
                      <button
                        onClick={() => setCategoryToRemove(cat)}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                  placeholder="New category name..."
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
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
                {notifications.length > 0 && unreadNotificationCount > 0 && (
                  <button
                    onClick={async () => {
                      await markAllNotificationsAsRead(user!.uid);
                      setUnreadNotificationCount(0);
                      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                      window.dispatchEvent(new CustomEvent('syft:notifications-read', { detail: { count: 0 } }));
                    }}
                    className="text-xs font-medium text-light-green hover:text-green transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length > 0 ? (
                <div className="divide-y divide-stone-100 rounded-3xl border border-stone-100 bg-white overflow-hidden">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onDelete={(id) => {
                        setNotifications(notifications.filter(n => n.id !== id));
                        if (!notification.isRead) {
                          setUnreadNotificationCount(prev => {
                            const next = Math.max(0, prev - 1);
                            window.dispatchEvent(new CustomEvent('syft:notifications-read', { detail: { count: next } }));
                            return next;
                          });
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

        </motion.div>
      </div>
    </>
  );
}