import React, { useEffect, useRef } from 'react';

const ExerciseVideo: React.FC<{ src: string; name: string }> = ({ src, name }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let visible = false;
        let userPaused = false;
        let automaticPause = false;

        const syncPlayback = () => {
            if (visible && !document.hidden && !motion.matches && !userPaused) {
                void video.play().catch(() => { /* Controls remain available if autoplay is blocked. */ });
            } else if (!video.paused) {
                automaticPause = true;
                video.pause();
            }
        };
        const onPause = () => {
            if (!automaticPause) userPaused = true;
            automaticPause = false;
        };
        const onPlay = () => { userPaused = false; };
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
            syncPlayback();
        }, { threshold: [0, 0.25] });

        video.addEventListener('pause', onPause);
        video.addEventListener('play', onPlay);
        document.addEventListener('visibilitychange', syncPlayback);
        motion.addEventListener('change', syncPlayback);
        observer.observe(video);
        return () => {
            observer.disconnect();
            video.removeEventListener('pause', onPause);
            video.removeEventListener('play', onPlay);
            document.removeEventListener('visibilitychange', syncPlayback);
            motion.removeEventListener('change', syncPlayback);
            video.pause();
        };
    }, [src]);

    return <video
        ref={videoRef}
        src={src}
        aria-label={`${name} demonstration`}
        controls
        loop
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-contain bg-black"
    />;
};

export default ExerciseVideo;
