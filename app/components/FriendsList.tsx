'use client';

import { useState } from 'react';
import { useFriends } from '../context/FriendsContext';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Button from './Button';

export default function FriendsList() {
    const {
        friends,
        incomingRequests,
        outgoingRequests,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        loading
    } = useFriends();

    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

    const handleAcceptRequest = async (requestId: string) => {
        try {
            await acceptFriendRequest(requestId);
            toast.success('Friend request accepted!');
        } catch (error: unknown) {
            console.error('Error accepting friend request:', error);
            toast.error('Failed to accept friend request');
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await rejectFriendRequest(requestId);
            toast.success('Friend request rejected');
        } catch (error: unknown) {
            console.error('Error rejecting friend request:', error);
            toast.error('Failed to reject friend request');
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        try {
            await removeFriend(friendId);
            toast.success('Friend removed');
        } catch (error: unknown) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b">
                <button
                    className={`pb-2 px-1 ${
                        activeTab === 'friends'
                            ? 'border-b-2 border-red-500 text-red-500'
                            : 'text-gray-500'
                    }`}
                    onClick={() => setActiveTab('friends')}
                >
                    Friends ({friends.length})
                </button>
                <button
                    className={`pb-2 px-1 ${
                        activeTab === 'requests'
                            ? 'border-b-2 border-red-500 text-red-500'
                            : 'text-gray-500'
                    }`}
                    onClick={() => setActiveTab('requests')}
                >
                    Requests ({incomingRequests.length})
                </button>
            </div>

            {/* Friends List */}
            {activeTab === 'friends' && (
                <div className="space-y-4">
                    {friends.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                            You haven&apos;t added any friends yet.
                        </p>
                    ) : (
                        friends.map((friend) => (
                            <div
                                key={friend.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-wrap gap-2"
                            >
                                <div className="flex items-center space-x-3 flex-wrap lrg:basis-2/3">
                                    {friend.photoURL ? (
                                        <Image
                                            src={friend.photoURL}
                                            alt={friend.displayName || 'Friend'}
                                            width={40}
                                            height={40}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                            <span className="text-gray-500 text-lg">
                                                {(friend.displayName || friend.email || '?')[0].toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-medium">
                                            {friend.displayName || 'Unknown User'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {friend.email}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="danger"
                                    onClick={() => handleRemoveFriend(friend.id)}
                                    className="max-w-30 basis-1/3"
                                >
                                    Remove
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Requests List */}
            {activeTab === 'requests' && (
                <div className="space-y-6">
                    {/* Incoming Requests */}
                    <div>
                        <h3 className="font-medium text-gray-700 mb-3">
                            Incoming Requests
                        </h3>
                        {incomingRequests.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                                No pending friend requests.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {incomingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            {request.senderPhotoURL ? (
                                                <Image
                                                    src={request.senderPhotoURL}
                                                    alt={request.senderName}
                                                    width={40}
                                                    height={40}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <span className="text-gray-500 text-lg">
                                                        {request.senderName[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-medium">
                                                    {request.senderName}
                                                </h4>
                                                <p className="text-sm text-gray-500">
                                                    {request.senderEmail}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="primary"
                                                onClick={() =>
                                                    handleAcceptRequest(request.id)
                                                }
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                variant="danger"
                                                onClick={() =>
                                                    handleRejectRequest(request.id)
                                                }
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Outgoing Requests */}
                    <div>
                        <h3 className="font-medium text-gray-700 mb-3">
                            Sent Requests
                        </h3>
                        {outgoingRequests.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                                No pending sent requests.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {outgoingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                <span className="text-gray-500 text-lg">?</span>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Waiting for response...
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="danger"
                                            onClick={() =>
                                                handleRejectRequest(request.id)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 