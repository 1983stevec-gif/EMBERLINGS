# Interface art

Cut from the supplied Home, Adventure HQ and Mythling Vault mockups with `scripts/art/cut-mockups.py`
and `scripts/art/cut-mockups-2.py` (OpenCV). Live values are removed from the art and drawn by `public/ui-exact.js`.

- `home.webp`, `map.webp`, `vault.webp`: full screens used on wide displays (1000 px and up).
- `home-hero.webp`, `home-tile0-3.webp`, `home-journey.webp`: pieces used by the stacked phone layout.
- `slot-gold.webp`, `slot-navy.webp`, `slot-icon-*.webp`, `badge-available.png`: Vault slot frames and icons.

- `map-eastern-islands.webp`: generated scenery for Thunder Valley and Shadow Realm in the continuous sideways Adventure HQ map. No UI or quest markers are baked into this image; labels, paths and all quest buttons remain live.
