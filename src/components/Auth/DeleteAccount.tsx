import React from 'react';

interface DeleteAccountProps {
    onBack: () => void;
}

const DeleteAccount: React.FC<DeleteAccountProps> = ({ onBack }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-h-[85vh] overflow-y-auto w-full max-w-3xl border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm pb-4 border-b border-gray-100 dark:border-gray-700 z-10">
                <div>
                    <h2 className="text-3xl font-extrabold text-red-600 dark:text-red-500 tracking-tight">Delete Account</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">FamiliGo Account Management</p>
                </div>
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="prose dark:prose-invert max-w-none text-left text-gray-600 dark:text-gray-300">
                <p className="mb-6 leading-relaxed">
                    We are sorry to see you go. If you wish to delete your <strong>FamiliGo</strong> account, please follow the instructions below. This process is irreversible.
                </p>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-red-100 text-red-600 py-1 px-2 rounded mr-2 text-sm">1</span>
                        How to Request Deletion
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">To initiate the account deletion process, please send an email to our support team:</p>
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                            <p className="font-bold text-gray-900 dark:text-white">Email: <a href="mailto:familigo.life@gmail.com" className="text-brand-blue hover:underline">familigo.life@gmail.com</a></p>
                            <p className="text-sm mt-2">Subject: <strong>Account Deletion Request</strong></p>
                            <p className="text-sm mt-1">Please include your registered email address in the body of the message.</p>
                        </div>
                        <p>
                            We will process your request within <strong>30 days</strong> of receiving your email.
                        </p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-red-100 text-red-600 py-1 px-2 rounded mr-2 text-sm">2</span>
                        What Data is Deleted
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">Upon deletion, the following data will be permanently removed from our systems:</p>
                        <ul className="list-disc pl-5 space-y-1 marker:text-red-500">
                            <li>Your user profile (name, email, avatar)</li>
                            <li>Your login credentials</li>
                            <li>Your personal settings and preferences</li>
                            <li>Your individual challenge history and stats</li>
                            <li>Your badge collection</li>
                        </ul>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-red-100 text-red-600 py-1 px-2 rounded mr-2 text-sm">3</span>
                        What Data is Retained
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">Some data may be retained for technical or legal reasons:</p>
                        <ul className="list-disc pl-5 space-y-1 marker:text-red-500">
                            <li>
                                <strong>Shared Content:</strong> Challenges or replies you posted to a Family Circle may remain visible to other family members to maintain the integrity of the group history. Your name may be replaced with "Deleted User".
                            </li>
                            <li>
                                <strong>Logs:</strong> Anonymized system logs may be kept for security and performance monitoring.
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-red-100 text-red-600 py-1 px-2 rounded mr-2 text-sm">4</span>
                        Retention Period
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p>
                            Once your deletion request is processed, your personal data is removed immediately from active databases. Backups may retain your data for up to <strong>90 days</strong> before being overwritten.
                        </p>
                    </div>
                </section>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                    onClick={onBack}
                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-2.5 px-8 rounded-lg transition-all"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default DeleteAccount;
