
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { View } from '../types';
import { FireIcon, UserCircleIcon, NewspaperIcon, SunIcon, MoonIcon, ClipboardIcon, ChatBubbleIcon } from './Icons';

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState(() => {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
            return localStorage.getItem('theme');
        }
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    const toggleTheme = () => {
        const t = theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', t);
        setTheme(t);
    };

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-brand-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
    const context = useContext(AppContext);
    const { currentUser } = context || {};

    return (
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="/assets/FamiliGo_logo.png" alt="FamiliGo Logo" className="h-12 w-auto object-contain" />
                    <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-pink tracking-tight">
                        FamiliGo
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {currentUser && (
                        <div className="flex items-center gap-2 bg-orange-100/50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full px-3 py-1 border border-orange-200 dark:border-orange-800">
                            <FireIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                            <span className="font-bold">{currentUser.streak}</span>
                        </div>
                    )}
                    <ThemeToggle />
                </div>
            </div>
            <nav className="max-w-2xl mx-auto px-4 pb-2">
                <div className="grid grid-cols-4 gap-2 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-lg">
                    <NavButton
                        icon={<NewspaperIcon className="w-6 h-6" />}
                        label="Feed"
                        isActive={activeView === 'feed'}
                        onClick={() => setActiveView('feed')}
                    />
                    <NavButton
                        icon={<ChatBubbleIcon className="w-6 h-6" />}
                        label="Chat"
                        isActive={activeView === 'chat'}
                        onClick={() => setActiveView('chat')}
                    />
                    <NavButton
                        icon={<ClipboardIcon className="w-6 h-6" />}
                        label="History"
                        isActive={activeView === 'history'}
                        onClick={() => setActiveView('history')}
                    />
                    <NavButton
                        icon={<UserCircleIcon className="w-6 h-6" />}
                        label="Profile"
                        isActive={activeView === 'profile'}
                        onClick={() => setActiveView('profile')}
                    />
                </div>
            </nav>
        </header >
    );
};

interface NavButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${isActive
                ? 'bg-brand-surface dark:bg-gray-700 shadow-sm text-brand-blue dark:text-blue-400'
                : 'text-brand-text-secondary dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'
                }`}
        >
            {icon}
            <span className="font-semibold text-sm">{label}</span>
        </button>
    );
};


export default Header;