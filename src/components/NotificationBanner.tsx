import React, { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
    message: string;
    onClose: () => void;
}

const NotificationBanner: React.FC<Props> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="
      fixed top-4 left-1/2 transform -translate-x-1/2
      z-50 w-[90%] max-w-md
      bg-white dark:bg-gray-800
      shadow-xl rounded-xl p-4
      flex items-center justify-between
      animate-slideDown
      border border-gray-200 dark:border-gray-700
    ">
            <div className="text-gray-900 dark:text-gray-100 font-medium">
                {message}
            </div>

            <button className="ml-4" onClick={onClose}>
                <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            </button>
        </div>
    );
};

export default NotificationBanner;
