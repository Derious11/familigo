import React,{ useContext,useEffect,useState } from 'react';
import { AppContext } from '../App';
import { View } from '../types';
import { ChatBubbleIcon,FireIcon,MoonIcon,NewspaperIcon,SunIcon,TrophyIcon,UserCircleIcon } from './Icons';
import AvatarImage from './ui/AvatarImage';
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
        }
        else {
            root.classList.remove('dark');
        }
    }, [theme]);
    return (<button onClick={toggleTheme} className="p-2 rounded-full text-brand-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors app-theme-toggle" aria-label="Toggle theme">
            {theme === 'light' ? <MoonIcon className="w-6 h-6"/> : <SunIcon className="w-6 h-6"/>}
        </button>);
};
const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
    const context = useContext(AppContext);
    const { currentUser, familyCircle } = context || {};
    const profileName = currentUser?.name?.trim() || 'Your profile';
    const unreadCount = (familyCircle?.messageCount || 0) - (currentUser?.lastReadMessageCount || 0);
    return (<header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300 app-header">
            <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between app-header-top">
                <div className="flex items-center gap-2">
                    {<button type="button" onClick={() => setActiveView('feed')} aria-label="FamiliGo feed" className="app-brand-button"><img src="/assets/brand/wordmark.webp" width="175" height="36" alt="FamiliGo" className="app-wordmark"/></button>}
                </div>
                <div className="flex items-center gap-3 app-header-status">
                    {currentUser && (<>
                            <button type="button" onClick={() => setActiveView('profile')} aria-label={`View profile for ${profileName}`} aria-current={activeView === 'profile' ? 'page' : undefined} className="app-header-profile">
                                <AvatarImage userId={currentUser.id} hasAvatar={currentUser.hasAvatar} cacheKey={currentUser.avatarUpdatedAt?.getTime?.()} alt="" className="app-header-avatar" />
                                <span className="app-header-identity">
                                    <span className="app-header-name" title={profileName}>{profileName}</span>
                                    <span className="app-header-family" title={familyCircle?.name || 'View your profile'}>{familyCircle?.name || 'View your profile'}</span>
                                </span>
                            </button>
                            {/* Streak */}
                            <div className="app-header-streak flex items-center gap-1 bg-orange-100/50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full px-2 py-1 border border-orange-200 dark:border-orange-800" aria-label={`${currentUser.streak} day login streak`} title="Consecutive days signed in">
                                <FireIcon className="w-4 h-4 text-orange-500 dark:text-orange-400"/>
                                <span className="font-bold text-xs">{currentUser.streak}</span>
                                {<span className="app-streak-label">day login streak</span>}
                            </div>

                            {/* Level & XP */}
                            <div className="app-header-progress flex flex-col items-end ml-1" aria-label={`Level ${currentUser.level || 1}, ${currentUser.xp || 0} XP`}>
                                <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 leading-none mb-1">
                                    LVL {currentUser.level || 1}
                                </div>
                                <span className="app-header-xp">{(currentUser.xp || 0).toLocaleString()} XP</span>
                                <div className="w-12 sm:w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full" style={{ width: `${Math.min(((currentUser.xp || 0) % 500) / 500 * 100, 100)}%` }}/>
                                </div>
                            </div>
                        </>)}
                    <ThemeToggle />
                </div>
            </div>
            <nav className="max-w-2xl mx-auto px-4 pb-2 app-navigation" aria-label="App navigation">
                <div className="grid grid-cols-4 gap-2 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-lg">
                    <NavButton icon={<NewspaperIcon className="w-6 h-6"/>} label="Feed" isActive={activeView === 'feed'} onClick={() => setActiveView('feed')}/>
                    <NavButton icon={<ChatBubbleIcon className="w-6 h-6"/>} label="Chat" isActive={activeView === 'chat'} onClick={() => setActiveView('chat')} badgeCount={unreadCount > 0 ? unreadCount : undefined}/>
                    <NavButton icon={<TrophyIcon className="w-6 h-6"/>} label="Leaderboard" isActive={activeView === 'history'} onClick={() => setActiveView('history')}/>
                    <NavButton icon={<UserCircleIcon className="w-6 h-6"/>} label="Profile" isActive={activeView === 'profile'} onClick={() => setActiveView('profile')}/>
                </div>
            </nav>
        </header>);
};
interface NavButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badgeCount?: number;
}
const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick, badgeCount }) => {
    return (<button onClick={onClick} aria-current={isActive ? 'page' : undefined} className={`app-nav-button relative flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${isActive
            ? 'bg-brand-surface dark:bg-gray-700 shadow-sm text-brand-blue dark:text-blue-400'
            : 'text-brand-text-secondary dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700/70'}`}>
            {icon}
            <span className="font-semibold text-sm">{label}</span>
            {badgeCount !== undefined && badgeCount > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center border-2 border-white dark:border-gray-800">
                    {badgeCount > 99 ? '99+' : badgeCount}
                </span>)}
        </button>);
};
export default Header;
