
import React from 'react';
import { User } from '../../types';

interface ViewAsBannerProps {
  currentUser: User;
  onRevert: () => void;
}

export const ViewAsBanner: React.FC<ViewAsBannerProps> = ({ currentUser, onRevert }) => {
  return (
    <div className="bg-yellow-500 text-black text-center p-2 font-semibold text-sm sticky top-0 z-[60]">
      <span>
        You are viewing the dashboard as{' '}
        <strong className="capitalize">{currentUser.role}: {currentUser.name}</strong>.
      </span>
      <button
        onClick={onRevert}
        className="ml-4 underline font-bold hover:text-gray-800"
      >
        Return to Admin View
      </button>
    </div>
  );
};
