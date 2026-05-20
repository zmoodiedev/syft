'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FiUser, FiSave, FiCamera, FiChevronLeft, FiCreditCard, FiExternalLink } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/app/lib/user';
import { UserProfile } from '@/app/models/User';
import Button from '@/app/components/Button';
import DeleteAccountModal from '@/app/components/DeleteAccountModal';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { auth } from '@/app/lib/firebase';
import Link from 'next/link';

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if the device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const profileData = await getUserProfile(user.uid);
        if (profileData) {
          setProfile(profileData as UserProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    setImageFile(file);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    
    try {
      const updates = { ...profile };
      
      // If there's a new image, upload it first
      if (imageFile) {
        const token = await user.getIdToken();
        // Delete old image if exists
        if (profile.photoURL) {
          try {
            await deleteImage(profile.photoURL, token);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }

        // Upload new image
        const imageUrl = await uploadImage(imageFile, token);
        updates.photoURL = imageUrl;
      }
      
      // Update the profile in Firestore
      await updateUserProfile(user.uid, updates);
      
      toast.success('Profile updated successfully');
      router.push(`/profile/${user.uid}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!auth.currentUser) return;
    setPortalLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not open billing portal.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/users/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete account');
    // Auth state clears automatically once the Firebase user is deleted
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-eggshell">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl pt-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-28 w-28 rounded-2xl bg-stone-300 animate-pulse ring-4 ring-eggshell flex-shrink-0" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-stone-200 rounded-2xl animate-pulse" />
            <div className="h-36 bg-stone-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eggshell">
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        userProfile={profile as UserProfile}
      />

      <div className="container mx-auto px-6 max-w-2xl pt-10">

        {/* Avatar preview */}
        <div className="mb-6">
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-2xl overflow-hidden bg-light-green shadow-sm">
              {(imagePreview || profile.photoURL) ? (
                <Image
                  src={imagePreview || profile.photoURL || ''}
                  alt="Profile"
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
            <label
              htmlFor="photoUpload"
              className="absolute bottom-2 right-2 w-8 h-8 bg-cast-iron rounded-xl flex items-center justify-center cursor-pointer shadow-sm hover:bg-cast-iron/80 transition-colors"
              title="Change photo"
            >
              <FiCamera className="w-4 h-4 text-white" />
            </label>
            <input id="photoUpload" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
          </div>
          {isMobile && (
            <>
              <label
                htmlFor="cameraUpload"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors cursor-pointer"
              >
                <FiCamera className="w-3.5 h-3.5" />
                Take photo instead
              </label>
              <input id="cameraUpload" type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="sr-only" />
            </>
          )}
          <p className="mt-1.5 text-xs text-steel/50">JPG or PNG. Max 7MB.</p>
        </div>

        {/* Back link + title */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push(`/profile/${user?.uid}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors mb-3"
          >
            <FiChevronLeft className="w-4 h-4" />
            Back to profile
          </button>
          <h1 className="text-2xl font-bold text-cast-iron">Edit Profile</h1>
          <p className="text-steel mt-1">Update your display name, bio, and privacy settings.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-10">

          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-semibold text-steel/50 uppercase tracking-wider">Basic Information</p>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-cast-iron mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={profile.displayName || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-cast-iron mb-1.5">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={profile.bio || ''}
                onChange={handleInputChange}
                rows={3}
                placeholder="Tell others about yourself..."
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors resize-none"
              />
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-steel/50 uppercase tracking-wider">Privacy</p>
              <p className="text-steel mt-1">Control who can see your profile and friends list.</p>
            </div>
            <div>
              <label htmlFor="profileVisibility" className="block text-sm font-medium text-cast-iron mb-1.5">
                Profile Visibility
              </label>
              <select
                id="profileVisibility"
                name="profileVisibility"
                value={profile.profileVisibility || 'public'}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-cast-iron focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label htmlFor="friendsVisibility" className="block text-sm font-medium text-cast-iron mb-1.5">
                Friends List Visibility
              </label>
              <select
                id="friendsVisibility"
                name="friendsVisibility"
                value={profile.friendsVisibility || 'public'}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-cast-iron focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/profile/${user?.uid}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

        </form>

        {/* Subscription */}
        <div className="mt-4 mb-4 bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-steel/50 uppercase tracking-wider mb-3">Subscription</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-cast-iron">
                {profile.tier === 'Pro' ? 'Pro plan' : 'Free plan'}
              </p>
              <p className="text-xs text-steel mt-0.5">
                {profile.tier === 'Pro'
                  ? 'Manage your billing, payment method, and cancellation.'
                  : 'Upgrade to Pro for unlimited recipes and social features.'}
              </p>
            </div>
            {profile.tier === 'Pro' ? (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-cast-iron border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <FiCreditCard className="w-3.5 h-3.5" />
                {portalLoading ? 'Opening...' : 'Manage'}
                <FiExternalLink className="w-3 h-3 opacity-50" />
              </button>
            ) : (
              <Link
                href="/billing"
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-light-green hover:bg-green transition-colors"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 mb-10 border border-red-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Danger Zone</p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-steel">Permanently delete your account and all associated data.</p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Delete account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}