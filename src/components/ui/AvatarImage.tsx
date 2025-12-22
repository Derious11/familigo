import React, { useEffect, useState } from "react";
import { AVATAR_PLACEHOLDER, getAvatarDownloadUrl } from "../../lib/avatar";

interface AvatarImageProps {
    userId?: string;
    alt?: string;
    className?: string;
    title?: string;
    cacheKey?: string | number;
}

const AvatarImage: React.FC<AvatarImageProps> = ({
    userId,
    alt = "",
    className = "",
    title,
    cacheKey,
}) => {
    const [src, setSrc] = useState<string>(AVATAR_PLACEHOLDER);

    useEffect(() => {
        let isMounted = true;

        if (!userId) {
            setSrc(AVATAR_PLACEHOLDER);
            return;
        }

        getAvatarDownloadUrl(userId, cacheKey).then((url) => {
            if (isMounted) setSrc(url);
        });

        return () => {
            isMounted = false;
        };
    }, [userId, cacheKey]);

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
