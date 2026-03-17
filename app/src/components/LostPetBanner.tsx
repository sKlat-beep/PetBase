import React, { FC } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { LostPetAlert } from '../utils/lostPetsApi';

interface LostPetBannerProps {
    lostPet: LostPetAlert;
}

export const LostPetBanner: FC<LostPetBannerProps> = ({ lostPet }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl overflow-hidden animate-pulse shadow-sm">
            <div className="bg-rose-600 text-white px-4 py-2 flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
                Active Local Alert: Lost {lostPet.petType}
            </div>
            <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <img
                    src={lostPet.image}
                    alt={lostPet.petName}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-white dark:border-rose-900 shadow-sm"
                    referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-rose-900 dark:text-rose-100">
                        {lostPet.petName} ({lostPet.breed})
                    </h3>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> Last seen: {lostPet.lastSeenLocation}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm font-medium text-rose-800 dark:text-rose-200">
                        <span>Contact: {lostPet.ownerName}</span>
                        <span>{lostPet.ownerPhone}</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/community')}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors whitespace-nowrap shadow-sm"
                >
                    View Details
                </button>
            </div>
        </div>
    );
}
