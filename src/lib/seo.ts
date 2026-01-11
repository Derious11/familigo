import { useEffect } from "react";

type SeoConfig = {
    title: string;
    description: string;
    canonicalPath?: string;
    ogImage?: string;
    ogType?: string;
    noIndex?: boolean;
    jsonLd?: Record<string, unknown> | null;
};

function ensureMeta(attr: "name" | "property", key: string) {
    const selector = `meta[${attr}="${key}"]`;
    let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
    }
    return tag;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
    const tag = ensureMeta(attr, key);
    tag.setAttribute("content", content);
}

function setCanonical(href: string) {
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
    }
    link.setAttribute("href", href);
}

function setJsonLd(jsonLd?: Record<string, unknown> | null) {
    const id = "seo-jsonld";
    const existing = document.getElementById(id);
    if (!jsonLd) {
        if (existing) existing.remove();
        return;
    }
    const script = (existing || document.createElement("script")) as HTMLScriptElement;
    script.type = "application/ld+json";
    script.id = id;
    script.text = JSON.stringify(jsonLd);
    if (!existing) document.head.appendChild(script);
}

export function usePageSeo(config: SeoConfig) {
    useEffect(() => {
        const origin = window.location.origin;
        const canonicalPath = config.canonicalPath ?? window.location.pathname;
        const canonicalUrl = `${origin}${canonicalPath}`;
        const ogImage = config.ogImage ?? `${origin}/og-image.png`;
        const ogType = config.ogType ?? "website";

        document.title = config.title;
        setCanonical(canonicalUrl);
        setMeta("name", "description", config.description);
        setMeta("name", "robots", config.noIndex ? "noindex, nofollow" : "index,follow");

        setMeta("property", "og:title", config.title);
        setMeta("property", "og:description", config.description);
        setMeta("property", "og:type", ogType);
        setMeta("property", "og:url", canonicalUrl);
        setMeta("property", "og:image", ogImage);

        setMeta("name", "twitter:card", "summary_large_image");
        setMeta("name", "twitter:title", config.title);
        setMeta("name", "twitter:description", config.description);
        setMeta("name", "twitter:image", ogImage);

        setJsonLd(config.jsonLd ?? null);
    }, [
        config.title,
        config.description,
        config.canonicalPath,
        config.ogImage,
        config.ogType,
        config.noIndex,
        config.jsonLd,
    ]);
}
