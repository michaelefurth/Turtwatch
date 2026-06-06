# TurtWatch — Screen-by-Screen UX

Global chrome: floating bottom tab bar (Home, Calendar, Shop, Facts, Profile),
pastel pond background with subtle drifting ripples/bubbles, rounded cards
(20–28px radius), soft shadows, sticker-style turtle art, mascot peeking in
corners. Primary CTA is always a big pill button.

## 1. Onboarding
- 3-card swipeable carousel, big sticker illustrations, dot pager.
- Mascot picker (two big tappable cards), theme picker (color swatch chips),
  notification opt-in, reminder time wheel.
- "Get started" pill → seeds starter Turtbux with a coin-rain animation.

## 2. Home (Today)
- Header: greeting + mascot mood ("Turtley is feeling 🐢✨").
- **Streak ring** (big): current streak number, flame/shell icon, longest streak below.
- **Today card:** if not done → big "Upload today's turtle" CTA; if done → today's
  photo thumbnail + "Done for today! 🎉" + edit link.
- Turtbux balance chip (tap → Shop).
- "Daily Turtle Fact" teaser card (tap → Facts).
- Active challenge progress bar (P1).

## 3. Daily Upload
- Big image dropzone / "Choose photo" + (MVP) "Use sample turtle" picker.
- Fields: Turtle name (text), Mood (emoji segmented picker), Notes (textarea),
  Tags (chip input), Location (optional toggle + label).
- Live "you'll earn ~X Turtbux" estimate.
- Sticky **Save turtle** pill button → celebration overlay.

## 4. Calendar
- Month grid; each day cell is a rounded tile with a state color + icon:
  - completed (mint + shell), missed (grey + 😴), repaired (peach + 🩹),
    ai-rescued (lilac + ✨), shielded (blue + 🛡️), today (ring), future (faint).
- Month nav arrows; legend chip row; tap a day → Daily Entry Detail.
- Mini stats footer: this month's completion %.

## 5. Daily Entry Detail
- Hero photo with selected frame; date + state badge.
- Turtle name, mood, notes, tags, location.
- If empty + past → recovery options panel (see Missed Day Repair).
- Actions: edit, delete (with confirm), share (P1).

## 6. Missed Day Repair
- Sleepy pond illustration: "This day took a nap 😴".
- Option cards, each with cost + outcome:
  - **Leave blank** (free).
  - **Backfill photo** — cost N Turtbux → state `repaired`.
  - **AI Turtle Rescue** — cost M Turtbux → state `ai-rescued` (server generates).
  - **Shell Shield** — use from inventory (or buy) → state `shielded`.
- Confirm modal shows balance math + streak impact.

## 7. Turtbux Shop
- Balance header + coin animation.
- Tabbed categories: Recovery, Shields, Themes, Stickers, Frames, Mascot Accessories.
- Item cards: preview, price, owned/equipped badge. Confirm-purchase modal.
- Premium banner (post-MVP) for subscription perks.

## 8. Turtle Facts Library
- Grid of collectible fact cards (category-colored), progress "12/40 collected".
- Card front: cute graphic + title; tap → flip to reveal fact text.
- Unread cards show a sparkle; first read awards Turtbux.

## 9. Profile
- Avatar = mascot with equipped accessory; chosen display name.
- Rank badge (Hatchling → Pond Sage…), Turtbux balance.
- Stat tiles: total turtles, current/longest streak, days repaired, shields used,
  facts read, completion %.
- Achievements grid (earned vs locked, greyed).

## 10. Settings
- Reminders (toggle + time), mascot, theme, units/timezone.
- Privacy (photo storage, analytics opt-out), data export/backup (P1),
  manage premium, about/credits, reset (dev).

## Accessibility & UX rules
- Large tap targets (≥44px), legible pastel contrast (AA), reduce-motion respected,
  haptics on celebration, all icons paired with text, color-state always paired
  with an icon/glyph (not color alone).
