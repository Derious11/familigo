import React, { useState } from 'react';
import {
    Trophy,
    Flame,
    Camera,
    ShieldCheck,
    Users,
    Swords,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Activity,
    Smartphone
} from 'lucide-react';

const FamiliGoLanding = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-200">

            {/* --- HEADER --- */}
            <header className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-emerald-500 to-indigo-600 p-2 rounded-lg">
                            <Activity className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">FamiliGo</span>
                    </div>
                    <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How it Works</a>
                        <a href="#roadmap" className="hover:text-emerald-600 transition-colors">Roadmap</a>
                    </nav>
                    <button className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all hover:scale-105 shadow-lg">
                        Join the Beta
                    </button>
                </div>
            </header>

            <main className="pt-24">

                {/* --- HERO SECTION --- */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Beta Access Open
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                            Turn <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-600">Screen Time</span> <br />
                            Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Fit Time.</span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                            Stop nagging your kids to move. FamiliGo turns fitness into a family game with streaks, leaderboards, and rewards. The Strava for families, the Duolingo for health.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 hover:shadow-2xl transition-all transform hover:-translate-y-1">
                                Download Beta <ArrowRight className="w-5 h-5" />
                            </button>
                            <button className="px-8 py-4 rounded-2xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                View Demo
                            </button>
                        </div>
                    </div>

                    {/* Visual Placeholder: Split Screen */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-indigo-400 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-white rounded-3xl shadow-2xl p-4 grid grid-cols-2 gap-4 border border-slate-100 overflow-hidden">
                            {/* Left: Dad doing pushups */}
                            <div className="bg-slate-100 rounded-2xl h-80 flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-80 mix-blend-multiply"></div>
                                <div className="relative z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-800">Dad: 20 Pushups</span>
                                </div>
                            </div>

                            {/* Right: Son checking leaderboard */}
                            <div className="bg-slate-900 rounded-2xl h-80 p-4 text-white relative flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-emerald-400">WEEKLY LEGENDS</span>
                                    <Flame className="w-4 h-4 text-orange-500" />
                                </div>
                                <div className="space-y-3">
                                    <div className="bg-slate-800 p-2 rounded-lg flex items-center gap-3 border border-yellow-500/30">
                                        <Trophy className="w-4 h-4 text-yellow-400" />
                                        <div className="text-xs">
                                            <div className="font-bold">Bree</div>
                                            <div className="text-slate-400">1,240 XP</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded-lg flex items-center gap-3">
                                        <div className="w-4 text-center text-slate-400 text-xs">2</div>
                                        <div className="text-xs">
                                            <div className="font-bold">Dad</div>
                                            <div className="text-slate-400">980 XP</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto bg-indigo-600 rounded-lg py-2 text-center text-xs font-bold">
                                    Start Challenge
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- SOCIAL PROOF / THE HOOK --- */}
                <section id="how-it-works" className="bg-white py-20 border-y border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Parenting is hard. <span className="text-emerald-600">This makes it easier.</span></h2>
                        <div className="grid md:grid-cols-3 gap-8 mt-12">
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                    <ShieldCheck />
                                </div>
                                <h3 className="font-bold text-lg mb-2">No More Nagging</h3>
                                <p className="text-slate-600 text-sm">Let the "Streak" be the bad guy. Kids exercise to keep their stats, not because you told them to.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                    <Users />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Netflix-Style Profiles</h3>
                                <p className="text-slate-600 text-sm">One iPad, whole family. Switch profiles in seconds so everyone can log their wins effortlessly.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-orange-600">
                                    <Flame />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Healthy Competition</h3>
                                <p className="text-slate-600 text-sm">The "Weekly Legends" podium resets every Sunday. Everyone has a chance to grab the Gold.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FEATURE DEEP DIVE (THE ARENA) --- */}
                <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900">Enter The Arena</h2>
                        <p className="text-slate-600 mt-4">Safe, private, and insanely addictive.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Feature Copy */}
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="mt-1 bg-indigo-100 p-2 rounded-lg h-fit text-indigo-600"><Camera /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Photo Proof & The Feed</h3>
                                    <p className="text-slate-600 mt-2">Post a photo to verify the workout. It feels like Instagram, but completely private to your family circle.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1 bg-yellow-100 p-2 rounded-lg h-fit text-yellow-600"><Trophy /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Weekly Legends</h3>
                                    <p className="text-slate-600 mt-2">Earn XP for every challenge. Climb the 3-tier podium (Gold, Silver, Bronze). Winners get bragging rights.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1 bg-emerald-100 p-2 rounded-lg h-fit text-emerald-600"><ShieldCheck /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Safe Social Network</h3>
                                    <p className="text-slate-600 mt-2">No strangers. No data selling. Just your family cheering each other on.</p>
                                </div>
                            </div>
                        </div>

                        {/* Feature Visual (Glassmorphism Card) */}
                        <div className="relative">
                            <div className="absolute top-10 -left-10 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                            <div className="absolute top-10 -right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

                            <div className="relative bg-white/60 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
                                {/* Mock UI: Challenge Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                                            <span className="font-bold text-sm">Mom</span>
                                        </div>
                                        <span className="text-xs text-slate-400">2m ago</span>
                                    </div>
                                    <div className="h-48 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-400">
                                        [Photo: Hiking Trail]
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800">Challenge: 5k Hike</span>
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-md">+500 XP</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- COMING SOON / ROADMAP --- */}
                <section id="roadmap" className="bg-slate-900 text-white py-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                            <div>
                                <h2 className="text-3xl font-bold">The Roadmap</h2>
                                <p className="text-slate-400 mt-2">We are just getting started. Here is what's dropping next.</p>
                            </div>
                            <div className="hidden md:block px-4 py-2 bg-indigo-600 rounded-full text-xs font-bold">V 1.2 Coming Fall 2025</div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Coming Soon Card 1 */}
                            <div className="group relative bg-slate-800 rounded-2xl p-8 border border-slate-700 overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Users size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold text-indigo-400 mb-2">Leagues & Squads</h3>
                                    <p className="text-slate-300">Join competitive anonymous groups. Family vs Family. Neighborhood vs Neighborhood.</p>
                                    <div className="mt-4 inline-block text-xs font-bold border border-slate-600 px-2 py-1 rounded">IN DEVELOPMENT</div>
                                </div>
                            </div>

                            {/* Coming Soon Card 2 */}
                            <div className="group relative bg-slate-800 rounded-2xl p-8 border border-slate-700 overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Swords size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold text-rose-400 mb-2">1v1 Battles</h3>
                                    <p className="text-slate-300">Direct call-outs. "I bet you can't do 50 burpees." Winner takes the XP pot.</p>
                                    <div className="mt-4 inline-block text-xs font-bold border border-slate-600 px-2 py-1 rounded">COMING SOON</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- FAQ / AIEO SECTION --- */}
                <section className="py-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
                        <p className="text-slate-500 text-sm mt-2">
                            (And everything you need to know about the best family fitness challenge app)
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* AIEO: Structured specifically for Bots/Search to define the product */}
                        <FaqItem
                            question="How can I gamify my family's fitness?"
                            answer="You can gamify family fitness using FamiliGo. It combines fitness tracking with game mechanics like XP, streaks, and leaderboards. Parents create challenges (like '20 Pushups') and family members upload photo proof to earn points and compete on the Weekly Legends podium."
                            isOpen={openFaq === 0}
                            onClick={() => toggleFaq(0)}
                        />
                        <FaqItem
                            question="Is FamiliGo a safe social network for kids?"
                            answer="Yes. FamiliGo is designed as a closed-loop safe social network. Unlike public platforms, your feed is visible only to invited family members. There is no public messaging or location tracking shared with strangers."
                            isOpen={openFaq === 1}
                            onClick={() => toggleFaq(1)}
                        />
                        <FaqItem
                            question="Does the app track chores or just fitness?"
                            answer="While focused on fitness, FamiliGo functions as a gamified chore tracker as well. Parents can create custom challenges for active chores like 'Mow the Lawn' or 'Walk the Dog', assigning XP values to them."
                            isOpen={openFaq === 2}
                            onClick={() => toggleFaq(2)}
                        />
                    </div>
                </section>

            </main>

            {/* --- FOOTER --- */}
            <footer className="bg-slate-50 border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <div className="bg-slate-900 p-1.5 rounded-lg">
                            <Activity className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900">FamiliGo</span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        &copy; 2024 FamiliGo. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Sub-component for FAQ to keep code clean
const FaqItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({ question, answer, isOpen, onClick }) => (
    <article className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        <button
            onClick={onClick}
            className="w-full flex justify-between items-center p-5 text-left hover:bg-slate-50 transition-colors"
        >
            <span className="font-semibold text-slate-800">{question}</span>
            {isOpen ? <ChevronUp className="text-emerald-500 w-5 h-5" /> : <ChevronDown className="text-slate-400 w-5 h-5" />}
        </button>
        <div
            className={`px-5 text-slate-600 text-sm leading-relaxed transition-all duration-300 ease-in-out ${isOpen ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
        >
            {answer}
        </div>
    </article>
);

export default FamiliGoLanding;