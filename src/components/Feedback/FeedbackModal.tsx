import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../App';
import { auth } from '../../firebaseConfig';
import { submitFeedback } from '../../services/feedbackService';
import { uploadFeedbackImage } from '../../services/storageService';
import { XMarkIcon, PhotoIcon, StarIcon } from '../Icons';

interface FeedbackModalProps {
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
    const { currentUser } = useContext(AppContext);
    const [issue, setIssue] = useState('');
    const [whatWorked, setWhatWorked] = useState('');
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [image, setImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!issue.trim() || !currentUser) return;

        setIsSubmitting(true);
        try {
            let screenshotUrl;
            if (image) {
                screenshotUrl = await uploadFeedbackImage(currentUser.id, image);
            }

            await submitFeedback({
                userId: currentUser.id,
                userName: currentUser.name || auth.currentUser?.displayName || 'Unknown',
                userEmail: currentUser.email || auth.currentUser?.email || undefined,
                role: currentUser.role || 'adult',
                context: window.location.pathname,
                issue,
                whatWorked,
                rating,
                screenshotUrl,
                userAgent: navigator.userAgent,
            });

            onClose();
            alert("Thanks for your feedback!");
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Send Feedback</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            What were you trying to do? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            value={issue}
                            onChange={(e) => setIssue(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-blue"
                            rows={3}
                            placeholder="I was trying to..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            What happened? (Optional)
                        </label>
                        <textarea
                            value={whatWorked}
                            onChange={(e) => setWhatWorked(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-blue"
                            rows={2}
                            placeholder="It worked, but..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate your experience</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`p-1 transition-colors ${rating && rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                >
                                    <StarIcon className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Screenshot (Optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full justify-center text-sm"
                        >
                            <PhotoIcon className="w-5 h-5 text-gray-500" />
                            {image ? image.name : "Upload Screenshot"}
                        </button>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-brand-blue text-white font-bold py-3 rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
