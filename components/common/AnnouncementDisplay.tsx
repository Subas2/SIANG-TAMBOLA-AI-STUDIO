
import React from 'react';
import { User } from '../../types';
import { api } from '../../services/mockApi';

interface AnnouncementDisplayProps {
    announcement: { text: string; id: number } | null;
    user: User;
}

export const AnnouncementDisplay: React.FC<AnnouncementDisplayProps> = ({ announcement, user }) => {
    if (!announcement || !announcement.text) {
        return null;
    }

    const handleDismiss = () => {
        api.admin.clearAnnouncement();
    };

    return (
        <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 p-3 my-2 rounded-lg shadow-md overflow-hidden relative">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                       <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.348 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 12c0 1.854-1.025 3.45-2.5 4.228V7.772c1.475.778 2.5 2.374 2.5 4.228z" />
                     </svg>
                </div>
                <div className="flex-grow">
                    <h4 className="font-bold">Announcement</h4>
                    <p className="text-sm">{announcement.text}</p>
                </div>
                {user.role === 'admin' && (
                    <button onClick={handleDismiss} className="absolute top-2 right-2 text-amber-800 hover:text-amber-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};
