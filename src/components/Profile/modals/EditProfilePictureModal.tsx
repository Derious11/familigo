
import React, { useState, useRef, useEffect, useContext } from 'react';
import { AppContext } from '../../../App';
import { uploadProfileImage } from '../../../services/storageService';
import { updateUserAvatar } from '../../../services/userService';
import { CameraIcon, PhotoIcon, XMarkIcon } from '../../Icons';
import confetti from 'canvas-confetti';

interface EditProfilePictureModalProps {
    onClose: () => void;
}

type View = 'select' | 'camera' | 'preview';

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
    if (!message) return null;
    return (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200 px-4 py-3 rounded-md my-4 text-sm text-center" role="alert">
            {message}
        </div>
    );
};


const EditProfilePictureModal: React.FC<EditProfilePictureModalProps> = ({ onClose }) => {
    const context = useContext(AppContext);
    const [view, setView] = useState<View>('select');
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        // Clear any lingering confetti when the modal opens
        try {
            confetti.reset();
        } catch (e) {
            // Ignore errors if confetti isn't active
        }

        const startCameraStream = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Camera API is not supported in this browser.");
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1080 },
                        height: { ideal: 1080 }
                    }
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err: any) {
                console.error("Error accessing camera:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError('Camera permission was denied. Please allow camera access in your browser settings.');
                } else {
                    setError('Could not access the camera. Please check permissions.');
                }
                setView('select');
            }
        };

        const stopCameraStream = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };

        if (view === 'camera') {
            startCameraStream();
        } else {
            stopCameraStream();
        }

        // Cleanup function for when the component unmounts
        return () => {
            stopCameraStream();
        };
    }, [view]);

    const handleTakePhotoClick = () => {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Your browser doesn't support camera access.");
            return;
        }
        setView('camera');
    };

    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (blob) {
                    setImageBlob(blob);
                    setImageUrl(URL.createObjectURL(blob));
                    setView('preview');
                }
            }, 'image/jpeg');
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageBlob(file);
            setImageUrl(URL.createObjectURL(file));
            setView('preview');
        }
    };

    const handleSave = async () => {
        if (!imageBlob || !context?.currentUser || !context.updateCurrentUser) return;
        setIsLoading(true);
        setError('');
        try {
            const downloadURL = await uploadProfileImage(context.currentUser.id, imageBlob);
            await updateUserAvatar(context.currentUser.id, downloadURL);
            context.updateCurrentUser({ avatarUrl: downloadURL });
            onClose();
        } catch (err: any) {
            console.error("Error uploading image:", err);
            let message = 'Failed to upload image. Please try again.';
            if (err.code === 'storage/unauthorized') {
                message = "Upload failed due to permissions. Please ensure your Firebase Storage rules are configured correctly.";
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setImageBlob(null);
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
        setImageUrl('');
        setError('');
        setView('select');
    };

    const renderContent = () => {
        switch (view) {
            case 'camera':
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Take a Picture</h3>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-gray-900 aspect-square object-cover"></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                        <ErrorMessage message={error} />
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => setView('select')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg">
                                Back
                            </button>
                            <button onClick={takePicture} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">
                                Capture
                            </button>
                        </div>
                    </div>
                );
            case 'preview':
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Preview</h3>
                        <img src={imageUrl} alt="Preview" className="w-full rounded-lg aspect-square object-cover" />
                        <ErrorMessage message={error} />
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={reset} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg">
                                Retake
                            </button>
                            <button onClick={handleSave} disabled={isLoading} className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">
                                {isLoading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                );
            case 'select':
            default:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-6 text-brand-text-primary dark:text-gray-100">Change Profile Picture</h3>
                        <ErrorMessage message={error} />
                        <div className="space-y-4">
                            <button onClick={handleTakePhotoClick} className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-brand-text-primary dark:text-gray-100 font-semibold py-4 px-4 rounded-lg transition-colors">
                                <CameraIcon className="w-6 h-6" /> Take Photo
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-brand-text-primary dark:text-gray-100 font-semibold py-4 px-4 rounded-lg transition-colors">
                                <PhotoIcon className="w-6 h-6" /> Upload from Library
                            </button>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default EditProfilePictureModal;
