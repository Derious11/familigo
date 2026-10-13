# FamiliGo achievement marketing screenshots

20 native JPEG screenshots and component crops, captured from the working local
FamiliGo app. All people, family data, messages and progress are synthetic demo
fixtures. No real family information or credentials are included. Nothing was
published or deployed.

| Prefix | Section | Suggested use |
| --- | --- | --- |
| 01 | Member profile | Mobile product overview |
| 02 | Featured badges and pin controls | Personalization and favorite achievements |
| 03 | Your Next Achievements | Progress toward attainable goals |
| 04 | Earned collection | Showcase the badge catalog |
| 05 | Locked badge collection | Explain unlock criteria and progression |
| 06 | Family achievement / Full House | Shared family success |
| 07 | Family Chat announcements | Encouragement and family engagement |
| 08 | Actual High Five unlock celebration | Feature launch and reward experience |
| 09 | Post Challenge | Simple challenge creation for the entire Family Circle |
| 10 | Newly created shared challenge | Show family-wide participation and 0/3 progress |
| 11 | Desktop achievement overview | Landing-page or newsletter feature block |

Mobile full-app captures use a 390 px wide viewport. Crop files show complete
sections without unrelated app chrome. Desktop crops use a 1440 px wide viewport.
The 08 mobile screenshot and its crop show an actual UI-triggered achievement,
not an illustrative mockup. 09 shows the form without a participant picker; 10 shows
the resulting challenge created through the trusted backend.

Some shots precede the High Five unlock (9 earned badges, High Five 2/3); later
shots follow it (10 earned badges). Use one stage consistently when combining
multiple screenshots in a single marketing layout. Screenshots have not been
retouched or composited. Emoji appearance reflects this capture platform.

Automated backend/security test sections have no customer-facing screen; their
results and acceptance coverage are documented in
[the implementation notes](../../../docs/achievement-system.md), rather than
represented as marketing screens.

The reproducible fixture script is scripts/seed-achievement-marketing.mjs. It
refuses to run without local Auth/Firestore emulators and uses only the demo
project. See docs/achievement-system.md for validation and deployment guidance.
