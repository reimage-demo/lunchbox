# September menu updates

Local implementation includes Garet spelling, cooked fish artwork, jerk pork lunch box/catering artwork, size pricing in the admin editor, customer size dropdowns, trusted checkout size pricing, larger prices, taller charcoal cart button, and catering sides copy.

New pork items use provisional prices matching jerk chicken: lunch box $18, catering tray $85. Admin can change these and enable Small, Medium and Large prices independently. Soup is initialized with Small $5 and Large $10. Other unpriced sizes stay disabled.

## Release

Deploy the Convex schema/functions and the public/admin artifacts together. After deploying Convex, run the targeted migration:

```sh
npx convex run --prod menuCatalog:applySeptemberMenuUpdates '{}'
```

The migration inserts missing pork items, initializes soup sizes if unset, replaces the standalone fish image and converts its legacy size group, and restores the current truck address only if it still contains 890 Boston. It preserves other menu items and subsequent admin size edits. Original address verified from existing site content: 104 Baltimore St, Hartford, CT 06112. Old map coordinates are cleared so directions use the restored address.

Image prompts and file names: assets/images/lunch-box/GENERATED-20260904.md.
