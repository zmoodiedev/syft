'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FiUser, FiImage, FiSave, FiCamera, FiChevronLeft } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/app/lib/user';
import { UserProfile } from '@/app/models/User';
import Button from '@/app/components/Button';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        // Delete old image if exists
        if (profile.photoURL) {
          try {
            await deleteImage(profile.photoURL);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }
        
        // Upload new image
        const imageUrl = await uploadImage(imageFile);
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
  if (loading) {
    return (
      <div className="min-h-screen bg-eggshell flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-light-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-6 py-10 md:py-14 max-w-2xl">

        {/* Page header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push(`/profile/${user?.uid}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors mb-4"
          >
            <FiChevronLeft className="w-4 h-4" />
            Back to profile
          </button>
          <h1 className="text-2xl font-bold text-cast-iron">Edit Profile</h1>
          <p className="text-sm text-steel mt-1">Update your display name, bio, and privacy settings.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Profile Photo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-cast-iron px-5 py-4">
              <p className="text-sm font-semibold text-white">Profile Photo</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm flex-shrink-0">
                  {(imagePreview || profile.photoURL) ? (
                    <Image
                      src={imagePreview || profile.photoURL || ''}
                      alt="Profile"
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
                <div>
                  <div className="flex flex-wrap gap-2">
                    <label
                      htmlFor="photoUpload"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-xl text-cast-iron bg-white hover:bg-gray-50 transition-colors"
                    >
                      <FiImage className="w-3.5 h-3.5" />
                      Choose photo
                    </label>
                    <input id="photoUpload" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />

                    {isMobile && (
                      <>
                        <label
                          htmlFor="cameraUpload"
                          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-xl text-cast-iron bg-white hover:bg-gray-50 transition-colors"
                        >
                          <FiCamera className="w-3.5 h-3.5" />
                          Take photo
                        </label>
                        <input id="cameraUpload" type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="sr-only" />
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-steel/50">JPG or PNG. Max 2MB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-cast-iron px-5 py-4">
              <p className="text-sm font-semibold text-white">Basic Information</p>
            </div>
            <div className="p-5 space-y-4">
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-cast-iron px-5 py-4">
              <p className="text-sm font-semibold text-white">Privacy</p>
              <p className="text-xs text-white/50 mt-0.5">Control who can see your profile and friends list.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="profileVisibility" className="block text-sm font-medium text-cast-iron mb-1.5">
                  Profile Visibility
                </label>
                <select
                  id="profileVisibility"
                  name="profileVisibility"
                  value={profile.profileVisibility || 'public'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-cast-iron focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-cast-iron focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors bg-white"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-6">
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
      </div>
    </div>
  );
}