import React from 'react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-h-[85vh] overflow-y-auto w-full max-w-3xl border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm pb-4 border-b border-gray-100 dark:border-gray-700 z-10">
                <div>
                    <h2 className="text-3xl font-extrabold text-brand-blue tracking-tight">Privacy Policy</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last updated: 11/23/2025</p>
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
                    <strong>FamiliGo</strong> (“we”, “us”, or “our”) is a family fitness and activity app that helps households stay active through shared challenges, progress tracking, and simple gamified goals. This Privacy Policy explains how we collect, use, and protect your information.
                </p>
                <p className="mb-8 leading-relaxed">
                    By using FamiliGo or creating an account, you agree to the terms in this Privacy Policy.
                </p>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">1</span>
                        Information We Collect
                    </h3>

                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700 space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">1.1 Information You Provide</h4>
                            <ul className="list-disc pl-5 space-y-1 marker:text-brand-blue">
                                <li>Email address (for login and account recovery)</li>
                                <li>Name or nickname (optional)</li>
                                <li>Profile photos (optional)</li>
                                <li>Challenge/activity data (steps, exercises, distances, etc., depending on integrations)</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">1.2 Automatically Collected Information</h4>
                            <ul className="list-disc pl-5 space-y-1 marker:text-brand-blue">
                                <li>Device information</li>
                                <li>Browser or app version</li>
                                <li>Log and usage information</li>
                                <li>IP address</li>
                                <li>Cookies (web version only)</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">1.3 Optional Permissions</h4>
                            <p className="mb-2">Depending on your use:</p>
                            <ul className="list-disc pl-5 space-y-1 marker:text-brand-blue">
                                <li>Camera access (uploading profile photos)</li>
                                <li>Storage access (uploading images/files)</li>
                                <li>Notifications (activity updates)</li>
                            </ul>
                            <p className="mt-2 text-sm italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                FamiliGo does not collect precise GPS location.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">2</span>
                        How We Use Your Information
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">We use your information to:</p>
                        <ul className="list-disc pl-5 space-y-1 marker:text-brand-blue mb-4">
                            <li>Provide the FamiliGo service</li>
                            <li>Create and manage accounts</li>
                            <li>Track challenge progress</li>
                            <li>Improve app performance</li>
                            <li>Provide customer support</li>
                            <li>Send optional notifications</li>
                        </ul>
                        <p className="font-medium text-brand-blue">We never sell or rent your data.</p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">3</span>
                        How We Share Information
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">We may share limited information with:</p>
                        <ul className="list-disc pl-5 space-y-1 marker:text-brand-blue mb-4">
                            <li>Service providers (hosting, authentication, analytics)</li>
                            <li>Legal authorities, if required</li>
                        </ul>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            No third-party advertisers
                        </div>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium mt-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            We do not sell personal information.
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">4</span>
                        Data Storage and Security
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">
                            Your data is securely stored using modern encryption and industry-standard security practices.
                        </p>
                        <p>
                            We take reasonable steps to protect your information, but no method of electronic transmission is 100% secure.
                        </p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">5</span>
                        Children’s Privacy
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">
                            FamiliGo is designed for families, but parents/guardians must create and manage profiles for any children.
                        </p>
                        <p className="font-medium">
                            We do not knowingly collect data directly from children without parental consent.
                        </p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">6</span>
                        Your Rights
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p className="mb-2">You may:</p>
                        <ul className="list-disc pl-5 space-y-1 marker:text-brand-blue mb-4">
                            <li>View your data</li>
                            <li>Update your data</li>
                            <li>Delete your account and data</li>
                            <li>Opt out of notifications</li>
                        </ul>
                        <p>
                            You can request account deletion by contacting us.
                        </p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">7</span>
                        Contact Us
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                        <p className="mb-2">If you have questions about this Privacy Policy or want to request account removal:</p>
                        <p className="font-bold text-brand-blue">
                            Email: <a href="mailto:support@familigo.life" className="hover:underline">support@familigo.life</a>
                        </p>
                    </div>
                </section>

                <section className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="bg-brand-blue/10 text-brand-blue py-1 px-2 rounded mr-2 text-sm">8</span>
                        Changes to This Policy
                    </h3>
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                        <p>
                            We may update this policy from time to time. The latest version will always be available at this link.
                        </p>
                    </div>
                </section>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                    onClick={onBack}
                    className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
