import React, { FC } from 'react';
import { useNavigate } from 'react-router';
import type { LostPetAlert } from '../utils/lostPetsApi';

interface LostPetBannerProps {
    lostPet: LostPetAlert;
}

export const LostPetBanner: FC<LostPetBannerProps> = ({ lostPet }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-error-container border border-outline-variant rounded-2xl overflow-hidden animate-pulse shadow-sm">
            <div className="bg-error text-on-error px-4 py-2 flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                <span className="material-symbols-outlined text-[20px] animate-bounce">warning</span>
                Active Local Alert: Lost {lostPet.petType}
            </div>
            <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <img
                    src={lostPet.image}
                    alt={lostPet.petName}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-surface shadow-sm"
                    referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-on-error-container">
                        {lostPet.petName} ({lostPet.breed})
                    </h3>
                    <p className="text-sm text-on-error-container/80 mt-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">location_on</span> Last seen: {lostPet.lastSeenLocation}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm font-medium text-on-error-container/90">
                        <span>Contact: {lostPet.ownerName}</span>
                        <span>{lostPet.ownerPhone}</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/community')}
                    className="bg-error hover:bg-error/90 text-on-error px-5 py-2.5 rounded-xl font-medium text-sm transition-colors whitespace-nowrap shadow-sm"
                >
                    View Details
                </button>
            </div>
        </div>
    );
}
