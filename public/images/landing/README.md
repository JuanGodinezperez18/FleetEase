# Landing page assets

Assets for the FleetEase landing-page scroll storytelling experience.

## Structure
- `public/images/landing/`: optimized background images and section imagery.
- `public/videos/landing/`: optional short, muted, looping background videos only when a still image is insufficient.

## Guidelines
- Prefer AVIF or WebP for images; provide responsive/mobile-friendly variants when useful.
- Keep hero and section backgrounds compressed and appropriately sized; avoid shipping full-resolution originals.
- For video, use short MP4/WebM loops, no audio, provide a poster image, and respect reduced-motion preferences. Do not commit large source footage.
- Use descriptive lowercase filenames, e.g. `hero-fleet-desktop.webp`, `hero-fleet-mobile.webp`, `operations-section.webp`.
- Reference files from the app as `/images/landing/filename.webp` or `/videos/landing/filename.mp4`.
- Use only assets FleetEase owns, licenses, or has permission to use.
- Keep text and calls to action as HTML/components, not baked into background images.

This README intentionally creates the asset directory in Git; upload optimized media here as implementation progresses.
