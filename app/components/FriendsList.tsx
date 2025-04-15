'use client';

import { useState } from 'react';
import { useFriends } from '../context/FriendsContext';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Button from './Button';
import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';
import { Dialog } from '@headlessui/react';

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
    const [isConfirming, setIsConfirming] = useState(false);
    const [requestToCancel, setRequestToCancel] = useState<string | null>(null);

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

    const handleCancelRequest = async (requestId: string) => {
        try {
            await rejectFriendRequest(requestId);
            toast.success('Friend request canceled');
        } catch (error) {
            console.error('Error canceling friend request:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to cancel friend request');
        } finally {
            setIsConfirming(false);
            setRequestToCancel(null);
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
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
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
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Incoming Requests</h3>
                                {incomingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                {request.senderName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{request.senderName}</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="primary"
                                                onClick={() => handleAcceptRequest(request.id)}
                                                className="text-sm"
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleRejectRequest(request.id)}
                                                className="text-sm"
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
                            <div className="space-y-4">
                                <div className="grid gap-4 grid-cols-1">
                                    {outgoingRequests.map((request) => (
                                        <motion.div
                                            key={request.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between flex-wrap gap-4"
                                        >
                                            <div className="flex items-center space-x-4">
                                                {request.receiverPhotoURL ? (
                                                    <Image
                                                        src={request.receiverPhotoURL}
                                                        alt={request.receiverName || 'User'}
                                                        width={40}
                                                        height={40}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <span className="text-gray-500 font-medium">
                                                            {request.receiverName?.charAt(0) || request.receiverEmail?.charAt(0) || '?'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {request.receiverName || 'Unknown User'}
                                                    </p>
                                                    <span className="inline-flex items-center text-sm text-emerald-600">
                                                        <FiClock className="mr-1" />
                                                        Pending response
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setRequestToCancel(request.id);
                                                    setIsConfirming(true);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={isConfirming}
                onClose={() => {
                    setIsConfirming(false);
                    setRequestToCancel(null);
                }}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-lg">
                        <Dialog.Title className="text-lg font-medium text-gray-900">
                            Cancel Friend Request
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm text-gray-500">
                            Are you sure you want to cancel this friend request? This action cannot be undone.
                        </Dialog.Description>

                        <div className="mt-4 flex justify-end space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsConfirming(false);
                                    setRequestToCancel(null);
                                }}
                            >
                                No, keep it
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => requestToCancel && handleCancelRequest(requestToCancel)}
                            >
                                Yes, cancel it
                            </Button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
} 