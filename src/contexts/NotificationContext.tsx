import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import NotificationBanner from '../components/NotificationBanner';
import { initializePush } from '../services/pushRouter';

interface NotificationContextType {
    showBanner: (message: string) => void;
    hideBanner: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationBanner = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationBanner must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bannerMessage, setBannerMessage] = useState<string | null>(null);

    const showBanner = useCallback((message: string) => {
        setBannerMessage(message);
    }, []);

    const hideBanner = useCallback(() => {
        setBannerMessage(null);
    }, []);

    useEffect(() => {
        // Initialize push notifications and pass the showBanner callback
        const unsubscribe = initializePush((message) => {
            showBanner(message);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [showBanner]);

    return (
        <NotificationContext.Provider value={{ showBanner, hideBanner }}>
            {children}
            {bannerMessage && (
                <NotificationBanner
                    message={bannerMessage}
                    onClose={hideBanner}
                />
            )}
        </NotificationContext.Provider>
    );
};
