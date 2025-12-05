import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../App';
import { CameraIcon, MicrophoneIcon, XMarkIcon, CheckIcon, PhotoIcon } from '../Icons'; // Added PhotoIcon
import { AddReplyPayload } from '../../types';

interface CreateReplyModalProps {
    onClose: () => void;
    challengeId: string;
}

// Browser Speech API Type Definition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const CreateReplyModal: React.FC<CreateReplyModalProps> = ({ onClose, challengeId }) => {
    const context = useContext(AppContext);

    // UI State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Data
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);

    const isSpeechApiAvailable = !!SpeechRecognition;

    // --- CLEANUP ---
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

    useEffect(() => {
        return () => cleanup();
    }, []);

    const handleClose = () => {
        cleanup();
        onClose();
    };

    // --- SUBMISSION LOGIC ---
    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Logic: If they provide no text and no image, we add a default friendly message.
            // If they provided an image but no text, we leave text empty.
            let finalText = text.trim();
            if (!finalText && !imageBlob) {
                finalText = "Completed the challenge! 🎉";
            }

            const payload: AddReplyPayload = {
                text: finalText,
                image: imageBlob || undefined
            };

            await context?.addReply(challengeId, payload, undefined, true);
            handleClose();
        } catch (err: any) {
            console.error('Failed to submit reply:', err);
            setError('Could not complete challenge. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- CAMERA LOGIC ---
    useEffect(() => {
        if (!isCameraOpen) return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                setError('Could not access the camera.');
                setIsCameraOpen(false);
            }
        };
        startCamera();

        // Cleanup when camera toggles off
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen]);

    const takePicture = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
            if (blob) {
                setImageBlob(blob);
                setIsCameraOpen(false); // Close camera view immediately after snap
            }
        }, 'image/jpeg');
    };

    // --- VOICE LOGIC ---
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
                // Append to existing text rather than replace
                if (finalTranscript) {
                    setText(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
                }
            };

            recognition.onend = () => setIsRecording(false);
            recognition.start();
            recognitionRef.current = recognition;
            setIsRecording(true);
        }
    }, [isRecording]);


    // --- RENDER ---

    // 1. Camera View (Overlay)
    if (isCameraOpen) {
        return (
            <div className="fixed inset-0 bg-black z-[60] flex flex-col">
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <button
                        onClick={() => setIsCameraOpen(false)}
                        className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="bg-black p-6 pb-10 flex justify-center">
                    <button
                        onClick={takePicture}
                        className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 ring-4 ring-white/30 active:scale-95 transition-transform"
                    ></button>
                </div>
            </div>
        );
    }

    // 2. Main Composer View
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-brand-green to-emerald-600 p-6 text-center text-white relative">
                    <button onClick={handleClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                        <CheckIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">Challenge Complete!</h3>
                    <p className="text-blue-50 text-sm opacity-90">Great job hitting your goal.</p>
                </div>

                <div className="p-6 space-y-4">
                    {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}

                    {/* Text Area with Integrated Mic */}
                    <div className="relative">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Add a note... (Optional)"
                            rows={3}
                            className="w-full p-3 pr-10 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none text-sm transition-all"
                        />
                        {isSpeechApiAvailable && (
                            <button
                                onClick={toggleRecording}
                                className={`absolute right-2 bottom-2 p-1.5 rounded-full transition-all ${isRecording
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                title="Voice to Text"
                            >
                                <MicrophoneIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Photo Logic */}
                    {imageBlob ? (
                        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 group">
                            <img src={URL.createObjectURL(imageBlob)} alt="Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => setImageBlob(null)}
                                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg"
                                >
                                    <TrashIcon className="w-3 h-3" /> Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCameraOpen(true)}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:border-brand-green hover:text-brand-green hover:bg-green-50 dark:hover:bg-green-900/10 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                        >
                            <CameraIcon className="w-5 h-5" />
                            Add Photo Proof (Optional)
                        </button>
                    )}

                    {/* Main Action Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/20 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span>Saving...</span>
                        ) : (
                            <>
                                <span>Complete Challenge</span>
                                <CheckIcon className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper for the "Add Photo" button
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
)

export default CreateReplyModal;