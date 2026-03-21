import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { PetProvider } from '../contexts/PetContext';
import { CommunityProvider } from '../contexts/CommunityContext';
import { SocialProvider } from '../contexts/SocialContext';
import { ExpenseProvider } from '../contexts/ExpenseContext';
import { SafetyAlertsProvider } from '../contexts/SafetyAlertsContext';
import { HouseholdProvider } from '../contexts/HouseholdContext';
import { MessagingProvider } from '../contexts/MessagingContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { RightPanelProvider } from '../contexts/RightPanelContext';
import { AvatarCacheProvider } from '../contexts/AvatarCacheContext';
import { UIProvider } from '../contexts/UIContext';

interface AppProvidersProps {
    children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <UIProvider>
        <AvatarCacheProvider>
        <RightPanelProvider>
            <AuthProvider>
                <ThemeProvider>
                    <PetProvider>
                        <ExpenseProvider>
                            <SocialProvider>
                                <CommunityProvider>
                                    <SafetyAlertsProvider>
                                        <HouseholdProvider>
                                            <MessagingProvider>
                                                <NotificationsProvider>
                                                    {children}
                                                </NotificationsProvider>
                                            </MessagingProvider>
                                        </HouseholdProvider>
                                    </SafetyAlertsProvider>
                                </CommunityProvider>
                            </SocialProvider>
                        </ExpenseProvider>
                    </PetProvider>
                </ThemeProvider>
            </AuthProvider>
        </RightPanelProvider>
        </AvatarCacheProvider>
        </UIProvider>
    );
}
