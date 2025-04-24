'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FiUser, FiLock, FiImage, FiSave, FiX, FiTag, FiCamera, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/app/lib/user';
import { UserProfile } from '@/app/models/User';
import Button from '@/app/components/Button';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { DEFAULT_CATEGORIES } from '@/app/components/RecipeForm';

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [findingCategories, setFindingCategories] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
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
  
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    setProfile(prev => ({
      ...prev,
      customCategories: [...(prev.customCategories || []), newCategory.trim()]
    }));
    
    setNewCategory('');
  };
  
  const handleRemoveCategory = (category: string) => {
    setProfile(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).filter(c => c !== category)
    }));
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
  
  // Add a new function to find categories from recipes
  const findCategoriesFromRecipes = async () => {
    if (!user) return;
    
    setFindingCategories(true);
    
    try {
      // Fetch the user's recipes
      const recipesRef = collection(db, 'recipes');
      const q = query(
        recipesRef,
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const recipesData = querySnapshot.docs.map(doc => doc.data());
      
      // Extract unique categories from all recipes
      const allCategories = new Set<string>();
      
      // Add existing custom categories
      if (profile.customCategories) {
        profile.customCategories.forEach((cat: string) => allCategories.add(cat));
      }
      
      // Add categories from recipes
      let newCategoriesFound = false;
      recipesData.forEach(recipe => {
        if (recipe.categories && Array.isArray(recipe.categories)) {
          recipe.categories.forEach((category: string) => {
            // Skip default categories
            if (!DEFAULT_CATEGORIES.includes(category) && !allCategories.has(category)) {
              allCategories.add(category);
              newCategoriesFound = true;
            }
          });
        }
      });
      
      // Update profile with the found categories
      if (newCategoriesFound) {
        const customCategories = Array.from(allCategories);
        setProfile(prev => ({
          ...prev,
          customCategories
        }));
        toast.success('Found new categories from your recipes!');
      } else {
        toast.success('No new categories found in your recipes.');
      }
    } catch (error) {
      console.error('Error finding categories from recipes:', error);
      toast.error('Failed to find categories from recipes');
    } finally {
      setFindingCategories(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-basil"></div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>
          
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FiUser className="mr-2" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={profile.displayName || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-basil focus:border-basil"
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={profile.bio || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-basil focus:border-basil"
                    placeholder="Tell others about yourself..."
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Photo
                  </label>
                  <div className="flex items-start space-x-4">
                    <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {(imagePreview || profile.photoURL) ? (
                        <Image 
                          src={imagePreview || profile.photoURL || ''}
                          alt="Profile"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-white">
                          <FiUser className="h-12 w-12 text-basil" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="photoUpload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          <FiImage className="mr-2" />
                          Choose Photo
                        </label>
                        <input 
                          id="photoUpload" 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                        
                        {isMobile && (
                          <>
                            <label htmlFor="cameraUpload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                              <FiCamera className="mr-2" />
                              Take Photo
                            </label>
                            <input 
                              id="cameraUpload" 
                              type="file" 
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageChange}
                              className="sr-only"
                            />
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        JPG or PNG. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Privacy Settings */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FiLock className="mr-2" />
                Privacy Settings
              </h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="profileVisibility" className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Visibility
                  </label>
                  <select
                    id="profileVisibility"
                    name="profileVisibility"
                    value={profile.profileVisibility || 'public'}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 text-sm rounded-lg focus:ring-2 focus:ring-basil focus:border-basil"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="friendsVisibility" className="block text-sm font-medium text-gray-700 mb-1">
                    Friends List Visibility
                  </label>
                  <select
                    id="friendsVisibility"
                    name="friendsVisibility"
                    value={profile.friendsVisibility || 'public'}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 text-sm rounded-lg focus:ring-2 focus:ring-basil focus:border-basil"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Custom Categories */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FiTag className="mr-2" />
                Custom Recipe Categories
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(profile.customCategories || []).map((category) => (
                  <div 
                    key={category}
                    className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {category}
                    <button 
                      type="button"
                      onClick={() => handleRemoveCategory(category)}
                      className="ml-2 text-basil hover:text-white"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add a category..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-basil focus:border-basil w-full md:w-auto"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-basil text-white rounded-r-lg hover:bg-basil"
                >
                  Add
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Create custom categories to organize your recipes.
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="mr-4"
                onClick={() => router.push(`/profile/${user?.uid}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex items-center"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}