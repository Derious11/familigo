import React, { useEffect, useState } from "react";
import { AVATAR_PLACEHOLDER, getAvatarDownloadUrl } from "../../lib/avatar";

interface AvatarImageProps {
    userId?: string;
    alt?: string;
    className?: string;
    title?: string;
    cacheKey?: string | number;
    hasAvatar?: boolean;
}

const AvatarImage: React.FC<AvatarImageProps> = ({
    userId,
    alt = "",
    className = "",
    title,
    cacheKey,
    hasAvatar,
}) => {
    const [src, setSrc] = useState<string>(AVATAR_PLACEHOLDER);

    useEffect(() => {
        let isMounted = true;

        setSrc(AVATAR_PLACEHOLDER);
        if (!userId || hasAvatar === false) {
            setSrc(AVATAR_PLACEHOLDER);
            return;
        }

        getAvatarDownloadUrl(userId, cacheKey).then((url) => {
            if (isMounted) setSrc(url);
        });

        return () => {
            isMounted = false;
        };
    }, [userId, cacheKey, hasAvatar]);

    return (
        <img
            src={src}
            alt={alt}
            title={title ?? alt}
            className={className}
            onError={() => setSrc(AVATAR_PLACEHOLDER)}
        />
    );
};

export default AvatarImage;
