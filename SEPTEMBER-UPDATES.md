# September owner updates

- Updated hero copy and HIStory with the approved text and quieter typography.
- Removed Find us today and its QR code.
- Fridays and Saturdays, 1 PM–11 PM.
- Single-size $15 Lunch Boxes, including Vegetarian Lunchbox. Meat/fish boxes include rice and peas plus cabbage or fried plantain.
- Callaloo is unpublished. The separate cabbage, festival and plantain meal is $10 under Sides.
- Drinks use proper cup photography on black backgrounds and the same image dimensions as meal cards.
- Product photos live in Convex storage. Public pages use admin-owned image URLs without overriding edits.
- Paid and demo order alerts use the configured Pushover devices. Test order TEST-234406 was delivered to the provider.

Backend functions and stored product photos are deployed. Run `menuCatalog:applyLunchBoxFocusUpdates` after releasing the public/admin code to apply the remaining catalog updates; it preserves stored photos and keeps callaloo unpublished.

Validation: workspace tests, Convex TypeScript, public build and admin build pass. Desktop/mobile image-frame sizes match.
