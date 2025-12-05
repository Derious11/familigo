import React, { useState } from 'react';
import { CheckIcon } from '../Icons';

const COVER_PRESETS = [
    { id: 'blue', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1000&q=80', label: 'Abstract Blue' },
    { id: 'nature', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1000&q=80', label: 'Nature' },
    { id: 'geo', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1000&q=80', label: 'Geometric' },
    { id: 'warm', url: 'https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?auto=format&fit=crop&w=1000&q=80', label: 'Warm' },
    { id: 'dark', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80', label: 'Tech' },
];

interface CoverPhotoPickerProps {
    currentCoverUrl?: string;
    onSave: (url: string) => void;
    onCancel: () => void; // Although the UI doesn't explicitly have a cancel button, clicking outside or toggling closes it.
}

const CoverPhotoPicker: React.FC<CoverPhotoPickerProps> = ({ currentCoverUrl, onSave }) => {
    const [coverPhotoInput, setCoverPhotoInput] = useState(currentCoverUrl || '');

    const handleSave = () => {
        if (coverPhotoInput) {
            onSave(coverPhotoInput);
        }
    };

    return (
        <div className="absolute top-14 right-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl z-20 w-80 border border-gray-200 dark:border-gray-700 animate-slide-in">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Choose Background</p>

            {/* 1. The Grid of Presets */}
            <div className="grid grid-cols-5 gap-2 mb-4">
                {COVER_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => {
                            setCoverPhotoInput(preset.url);
                            // Optional: Auto-save immediately on click for better UX?
                            // For now, we update state and let them click save.
                        }}
                        className={`relative h-10 rounded-lg overflow-hidden border-2 transition-all hover:scale-110 ${coverPhotoInput === preset.url ? 'border-brand-blue ring-2 ring-brand-blue/30' : 'border-transparent'}`}
                        title={preset.label}
                    >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        {/* Checkmark overlay if selected */}
                        {coverPhotoInput === preset.url && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                <span className="flex-shrink-0 mx-2 text-xs text-gray-400">OR PASTE URL</span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* 2. Custom Input Fallback */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="https://..."
                    value={coverPhotoInput}
                    onChange={(e) => setCoverPhotoInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-brand-blue outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600 truncate"
                />
                <button
                    onClick={handleSave}
                    className="text-xs bg-brand-blue hover:bg-blue-600 text-white px-3 py-1 rounded-lg font-medium shadow-md"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default CoverPhotoPicker;
