# Clone Rush — portal delivery

Run `npm run package:portals` to rebuild the two ad-free upload archives in
`release/crazygames/` and `release/gamepix/`. The script audits file count,
size, URL format and the absence of portal SDK or ad calls, then writes SHA-256
manifests. It converts six decorative PNG images to WebP in the release only,
leaving gameplay terrain, clones and portals untouched. Python with Pillow is
required for the packaging step. It leaves previews and browser QA captures in
place. The resulting web bundle is 17,564,705 bytes (42 files), below
CrazyGames' 20 MB mobile homepage threshold; the ZIP is 16,004,426 bytes.

The CrazyGames folder also includes `previews/clone-rush-landscape-preview.mp4`
and `previews/clone-rush-portrait-preview.mp4` (17.52 seconds, mute,
1920×1080 and 1080×1620). Both begin with the matching static ImageGen cover.
The covers in `artwork/` are 1920×1080, 800×1200, 800×800 and 512×512.
The `submission.md` in each release folder contains the English title,
description, controls and portal steps.

Browser checks loaded the extracted, optimized archive from `/web/` and reached lobby,
level selection and gameplay at 907×510, 821×462, 800×450, 640×480 and
390×844. The static package produced no page errors or HTTP failures in those
checks. See ignored `release/crazygames/qa/` for screenshots and recordings.

## Rights and account steps

The current runtime audio is independently synthesized. The original public
Git commit still contains the former derivative audio in its history, and
the project's documented physics metadata and early campaign originated from
*Jumping Clones*. Establish ownership or permission for the remaining content,
or replace it, before portal submission. If public Git history itself must be
clean, plan a separate history rewrite with the repository owner. This release
preparation did not submit the game or change portal account settings.

After rights are confirmed, upload each ZIP and its materials through the
respective developer portal, keep ads off, preview in each portal iframe, and
submit for review. CrazyGames Basic Launch permits an SDK-free game; GamePix's
submission guidelines also permit SDK-free uploads, although its SDK guide
describes the SDK import as mandatory for SDK integrations. Resolve any portal
review request in its private preview before public release.

Official references:

- https://docs.crazygames.com/requirements/intro/
- https://docs.crazygames.com/requirements/technical/
- https://docs.crazygames.com/requirements/game-covers/
- https://partners.gamepix.com/guidelines/submission
- https://partners.gamepix.com/sdk/doc/javascript
