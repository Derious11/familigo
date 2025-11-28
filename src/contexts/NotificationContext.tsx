import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import NotificationBanner from '../components/NotificationBanner';
import { initializePush } from '../services/pushRouter';

export interface NotificationData {
    title?: string;
    body?: string;
}

interface NotificationContextType {
    showBanner: (data: NotificationData) => void;
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
    const [notification, setNotification] = useState<NotificationData | null>(null);

    const showBanner = useCallback((data: NotificationData) => {
        setNotification(data);
    }, []);

    const hideBanner = useCallback(() => {
        setNotification(null);
    }, []);

    useEffect(() => {
        // Initialize push notifications and pass the showBanner callback
        const unsubscribe = initializePush((data) => {
            showBanner(data);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [showBanner]);

    return (
        <NotificationContext.Provider value={{ showBanner, hideBanner }}>
            {children}
            {notification && (
                <NotificationBanner
                    title={notification.title}
                    body={notification.body}
                    onClose={hideBanner}
                />
            )}
        </NotificationContext.Provider>
    );
};
