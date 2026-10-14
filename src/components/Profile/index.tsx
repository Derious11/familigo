import React,{ useContext,useEffect,useMemo,useState } from 'react';
import { AppContext } from '../../App';
import { requestNotificationPermission,revokeNotificationPermission } from '../../services/pushRouter';
import { updateCoverPhoto } from '../../services/userService';
import { useDeviceNotifications } from '../../pwa/PushNotificationProvider';

// Sub-components
import ActivityHeatmap from './ActivityHeatmap';
import BadgeCollection from './BadgeCollection';
import FamilyCircleCard from './FamilyCircleCard';
import ProfileHeader from './ProfileHeader';
import ProfileSettings from './ProfileSettings';
// Modals
import AppTabIntro from '../AppTabIntro';
import PrivacyPolicy from '../Auth/PrivacyPolicy';
import EditProfileModal from './modals/EditProfileModal';
import FamilySettingsModal from './modals/FamilySettingsModal';
import UpdateWeightModal from './modals/UpdateWeightModal';
const Profile: React.FC = () => {
    const context = useContext(AppContext);
    const deviceNotifications = useDeviceNotifications();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isFamilySettingsOpen, setIsFamilySettingsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isNotificationToggleLoading, setIsNotificationToggleLoading] = useState(false);
    const [familySettingsInitialTab, setFamilySettingsInitialTab] = useState<'members' | 'add' | 'general'>('members');
    if (!context || !context.currentUser) {
        return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
    }
    const { currentUser, familyCircle, signOut, updateCurrentUser, isImpersonating, originalUserId, switchProfile } = context;
    const hasNotificationsEnabled = useMemo(() => {
        if (deviceNotifications) return deviceNotifications.enabled;
        return currentUser.notificationTokens && currentUser.notificationTokens.length > 0;
    }, [currentUser.notificationTokens, deviceNotifications?.enabled]);
    useEffect(() => {
        // Check if we should auto-open family settings (e.g. from onboarding)
        const justCreated = sessionStorage.getItem('justCreatedFamily');
        if (justCreated) {
            setFamilySettingsInitialTab('add');
            setIsFamilySettingsOpen(true);
            sessionStorage.removeItem('justCreatedFamily');
        }
    }, []);
    const handleNotificationToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const enable = e.target.checked;
        setIsNotificationToggleLoading(true);
        try {
            if (deviceNotifications) {
                if (enable) await deviceNotifications.enable();
                else await deviceNotifications.disable();
                return;
            }
            if (enable) {
                const result = await requestNotificationPermission(currentUser.id);
                if (result.success) {
                    const tokens = currentUser.notificationTokens || [];
                    if (result.token && !tokens.includes(result.token)) {
                        updateCurrentUser({
                            notificationTokens: [...tokens, result.token],
                        });
                    }
                }
                else {
                    alert(`Could not enable notifications: ${result.error}`);
                }
            }
            else {
                await revokeNotificationPermission(currentUser.id);
                updateCurrentUser({ notificationTokens: [] });
            }
        }
        catch (error) {
            console.error("Failed to toggle notifications:", error);
            alert("An unexpected error occurred. Please try again.");
        }
        finally {
            setIsNotificationToggleLoading(false);
        }
    };
    const handleUpdateCover = async (url: string) => {
        try {
            await updateCoverPhoto(currentUser.id, url);
        }
        catch (error) {
            console.error("Failed to update cover photo:", error);
            alert("Failed to update cover photo.");
        }
    };
    return (<div className="space-y-6 pb-24 animate-fade-in app-profile-page">
            {<AppTabIntro eyebrow="Small steps. Your story." title="Look at you go." description="Your progress, family, and little wins—all in one place."/>}
            <ProfileHeader currentUser={currentUser} onUpdateCover={handleUpdateCover} onEditProfile={() => setIsEditModalOpen(true)} onUpdateWeight={() => setIsWeightModalOpen(true)}/>

            <div className={'app-profile-grid'}>
            <ActivityHeatmap activityMap={currentUser.activityMap || {}}/>

            <BadgeCollection user={currentUser} familyCircleId={familyCircle?.id}/>
            </div>

            {familyCircle && (<FamilyCircleCard familyCircle={familyCircle} currentUser={currentUser} isImpersonating={isImpersonating} originalUserId={originalUserId} onSwitchProfile={switchProfile} onManage={() => setIsFamilySettingsOpen(true)}/>)}

            <ProfileSettings currentUser={currentUser} hasNotificationsEnabled={hasNotificationsEnabled} isNotificationToggleLoading={isNotificationToggleLoading} onToggleNotifications={handleNotificationToggle} onOpenPrivacy={() => setIsPrivacyOpen(true)} onSignOut={signOut}/>

            {/* Modals */}
            {isEditModalOpen && <EditProfileModal onClose={() => setIsEditModalOpen(false)}/>}
            {isWeightModalOpen && <UpdateWeightModal onClose={() => setIsWeightModalOpen(false)}/>}
            {isFamilySettingsOpen && <FamilySettingsModal onClose={() => setIsFamilySettingsOpen(false)} initialTab={familySettingsInitialTab}/>}
            {isPrivacyOpen && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPrivacyOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Privacy Policy</h3>
                            <button onClick={() => setIsPrivacyOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <PrivacyPolicy onBack={() => setIsPrivacyOpen(false)} className="shadow-none border-none p-0 max-h-none overflow-visible w-full max-w-none" hideHeader={true} hideFooter={true}/>
                        </div>
                    </div>
                </div>)}
        </div>);
};
export default Profile;
