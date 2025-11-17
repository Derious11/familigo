
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../App';
import { CameraIcon, KeyboardIcon, MicrophoneIcon, XMarkIcon } from './Icons';
import { AddReplyPayload } from '../types';

interface CreateReplyModalProps {
    onClose: () => void;
    challengeId: string;
}

type View = 'select' | 'camera' | 'text' | 'voice';

// Fallback for SpeechRecognition
// FIX: Cast window to any to access browser-specific SpeechRecognition APIs.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const CreateReplyModal: React.FC<CreateReplyModalProps> = ({ onClose, challengeId }) => {
    const context = useContext(AppContext);
    const [view, setView] = useState<View>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // States for different reply types
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [text, setText] = useState('');
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);

    const isSpeechApiAvailable = !!SpeechRecognition;

    const cleanup = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    };

    const handleClose = () => {
        cleanup();
        onClose();
    };

    const handleSubmit = async (payload: AddReplyPayload) => {
        setIsLoading(true);
        setError('');
        try {
            await context?.addReply(challengeId, payload);
            handleClose();
        } catch (err: any) {
            console.error('Failed to submit reply:', err);
            if (err.code === 'storage/unauthorized') {
                setError("Upload failed. Please check your Firebase Storage rules to allow writes to 'reply-images/'.");
            } else {
                setError('Could not submit your reply. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- Camera Logic ---
    useEffect(() => {
        if (view !== 'camera') return;
        
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                setError('Could not access the camera. Please check permissions.');
                setView('select');
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [view]);

    const takePicture = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
            if (blob) {
                setImageBlob(blob);
            }
        }, 'image/jpeg');
    };

    // --- Voice Logic ---
    const toggleRecording = useCallback(() => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                setTranscript(prev => prev + finalTranscript);
            };
            recognition.onend = () => setIsRecording(false);
            recognition.start();
            recognitionRef.current = recognition;
            setIsRecording(true);
        }
    }, [isRecording]);

    const renderContent = () => {
        switch (view) {
            case 'camera':
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Take a Photo</h3>
                        <div className="relative">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-gray-900 aspect-square object-cover"></video>
                            {imageBlob && <img src={URL.createObjectURL(imageBlob)} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-lg" />}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => { setView('select'); setImageBlob(null); }} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg">Back</button>
                            {imageBlob ? (
                                <button onClick={() => handleSubmit({ image: imageBlob })} disabled={isLoading} className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">
                                    {isLoading ? 'Submitting...' : 'Submit Photo'}
                                </button>
                            ) : (
                                <button onClick={takePicture} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg">Capture</button>
                            )}
                        </div>
                    </div>
                );
            case 'text':
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Write a Message</h3>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={4}
                            placeholder="Great workout!"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"
                        />
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => setView('select')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg">Back</button>
                            <button onClick={() => handleSubmit({ text })} disabled={isLoading || !text} className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">
                                {isLoading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                );
            case 'voice':
                 return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-4 text-brand-text-primary dark:text-gray-100">Record a Message</h3>
                        <div className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md min-h-[96px]">{transcript || <span className="text-gray-400">Your message will appear here...</span>}</div>
                        <button onClick={toggleRecording} className={`w-full flex items-center justify-center gap-2 mt-4 font-bold py-3 px-4 rounded-lg text-white ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-blue hover:bg-blue-600'}`}>
                           <MicrophoneIcon className="w-5 h-5"/> {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </button>
                         <div className="grid grid-cols-2 gap-2 mt-2">
                            <button onClick={() => setView('select')} className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-bold py-3 px-4 rounded-lg">Back</button>
                            <button onClick={() => handleSubmit({ text: transcript })} disabled={isLoading || !transcript} className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50">
                                {isLoading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                );
            case 'select':
            default:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-center mb-6 text-brand-text-primary dark:text-gray-100">How did it go?</h3>
                        <div className="space-y-3">
                            <button onClick={() => setView('camera')} className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold py-3 px-4 rounded-lg">
                                <CameraIcon className="w-6 h-6" /> Take a Photo
                            </button>
                            <button onClick={() => setView('text')} className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold py-3 px-4 rounded-lg">
                                <KeyboardIcon className="w-6 h-6" /> Write a Message
                            </button>
                            {isSpeechApiAvailable && (
                                <button onClick={() => setView('voice')} className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold py-3 px-4 rounded-lg">
                                    <MicrophoneIcon className="w-6 h-6" /> Use Your Voice
                                </button>
                            )}
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="p-6">
                    {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
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

export default CreateReplyModal;
