import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
    title?: string;
    body?: string;
    onClose: () => void;
}

const NotificationBanner: React.FC<Props> = ({ title, body, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = () => {
        setIsExiting(true);
        // Wait for animation to finish before calling onClose
        setTimeout(onClose, 400);
    };

    return (
        <div
            className={`
                fixed top-4 left-1/2 transform -translate-x-1/2
                z-[60] w-[90%] max-w-md
                bg-white/90 dark:bg-gray-800/90
                backdrop-blur-md
                shadow-2xl rounded-2xl p-4
                flex items-start justify-between
                border border-gray-200/50 dark:border-gray-700/50
                mt-[env(safe-area-inset-top)]
                transition-all duration-300 ease-out
                ${isExiting ? 'opacity-0 -translate-y-4' : 'animate-slideDown'}
            `}
            role="alert"
        >
            <div className="flex-1 mr-3">
                {title && (
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                        {title}
                    </h4>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
                    {body || "New Notification"}
                </p>
            </div>

            <button
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={handleClose}
                aria-label="Close notification"
            >
                <XMarkIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </button>
        </div>
    );
};

export default NotificationBanner;
