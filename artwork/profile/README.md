# Profile artwork

These original PNGs are source artwork, outside the Hosting public directory.
The web client uses WebP files under public/assets/profile-art:
ten 192px transparent crests; six 1440px banners with six 300px picker thumbnails.
The catalog in src/components/Profile/profileArt.ts defines labels, stable URLs,
and crop positions. Keep existing URLs available for previously saved profiles.
The browser integration test scripts/test-profile-art.mjs runs against the
dedicated Firebase review emulators. Development deployment preserved the
pre-existing dev rules and applied only the family avatar permission change.
