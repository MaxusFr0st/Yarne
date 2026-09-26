# Speed increase plan

Three changes, in this order, all following one rule.

## The rule: nothing changes in front of the visitor

Once something is visible, it does not change during that visit. Content may only update while it is off screen.

**Why:** since commit `c350d4ad`, a returning visitor's sections start from the copy saved on the last visit. If something was changed in admin since then (hero, Why texts, bento picks), they see the old version and then a swap. That is the same flash we set out to remove.

**How the rule applies:**

- **Built-in defaults are never shown.** A visitor only ever sees content the server gave, now or on an earlier visit.
- **Hero (visible immediately):** it is not shown until the current version is known. Change 3 below makes that answer arrive before the app starts, so there is normally no wait. If the server is slow, the saved hero is shown and kept for this visit; a change is used next time.
- **Sections below the hero:** on a first visit each one stays invisible until its content arrives, then fades in. On a return visit they start from the saved copy and update only while still off screen. If the visitor has already scrolled to a section, it keeps what they see and the update applies next visit.
- **Photos:** each photo fades in once, when fully downloaded. A replacement photo is only swapped in while its section is off screen.

**Trade-off:** when the server is slow, a visitor may see the previous version for one visit. They never see anything change while they are looking at it.

---

## 1. Photo loading order

### The catalogue today (measured on the live site)

| What | Photos | Size |
|---|---|---|
| Default photo of every product | 9 | ≈ 2.3 MB |
| Main photo of every colour | 22 | ≈ 5.6 MB |
| Default photo + full gallery of the default colour of every product | 39 | ≈ 10 MB |
| Everything (all colours, sizes, galleries) | 95 | ≈ 24 MB |

Every photo is one file used everywhere: the Бестселери carousel, the bento, the collection cards and the product page show the same file for the same colour. Photos are cached by the browser for a year, so **a photo downloaded once is never downloaded again**, on any page.

**The product page's first photo is the card's photo** (checked: true for all 24 colours). So when a visitor taps any card, the product page's main photo is already on their phone and appears instantly. What a product page adds is the rest of that colour's gallery (its thumbnails), about 3 more photos.

### The rule for what to download: "one tap away"

Instead of guessing what the visitor is interested in, the site prepares **everything the visitor can open with one tap from what is on their screen right now**, nearest first:

1. **On screen:** the photos the visitor is looking at. Urgent.
2. **One tap away:** for every product whose card, bento tile or Why bag is on screen:
   - its product page: the rest of its default colour's gallery (about 3 photos);
   - its other colours' main photos, so swatch taps are instant.
3. **One scroll away:** the same for the cards just below the screen, so they are ready before the visitor reaches them.
4. **The rest of the site's first screens:** the default photo of every product (2.3 MB in total), so the collection page is instant from anywhere.

When the visitor scrolls or moves to another page, the list is recalculated from what is now on screen. Products the visitor never scrolls to are never prepared beyond their one default photo.

This covers every way into a product page: collection cards, Бестселери, the bento and the Why section bags all link to products, so whichever of them is on screen gets its linked product prepared.

**Desktop** (usually on Wi‑Fi) continues after step 4 and downloads everything else in the background (all colours, sizes and galleries, ≈ 24 MB), so every product page, colour and size is instant.

**Phones** stop after step 4, except on a product page the visitor has opened (below).

### On any product page (however the visitor got there)

Once a visitor opens a product, that product becomes "the screen", and **every photo of that product** is downloaded while they stay on the page, nearest first. Products have 3–39 photos (≈ 1–10 MB); the visitor chose this one, so it is worth it on phones too.

1. **The main photo.** Already downloaded when they came from a card, bento tile or Why bag.
2. **The thumbnails of the shown colour and size** (they are on screen).
3. **One tap away:** the first photo of every other colour and every other size, so any colour or size tap shows its photo instantly.
4. **The rest of this product:** the full gallery of every colour and size, one or two at a time.
5. If the visitor leaves the page, the remaining downloads for it stop; whatever finished stays cached.

With **"save data"** turned on, only step 1 runs.

### How the download queue works

- **It is a priority list, not a line.** When the screen changes, the list is re-sorted; a product the visitor just scrolled to or tapped goes straight to the top, even if it is the last product in the collection.
- **Background downloads never block a tap.** At most 2 background photos download at a time. The browser can run many more, so a photo the visitor asks for starts immediately, alongside those 2, never after them. Photos are around 250 KB, so sharing the connection with 2 others costs at most a fraction of a second.
- **The page the visitor just opened goes first.** While a new page is loading its own on-screen photos, background downloads pause, and resume once those are done.
- Photos already downloaded are skipped.

### Workflow A: the visitor opens the home page first

1. **Hero:** its heading and photo (see change 3). The page appears as soon as they are ready. Nothing else is waited for.
2. **The rest of the home page:** the content of the Why section, Бестселери, the showcase and editorial, plus their photos, downloaded in the background while the visitor looks at the hero. Today these photos only start when the visitor scrolls near them; after this change they are already there.
3. **One tap away:** as each section comes on screen, the products it links to (Бестселери cards, bento tiles, Why bags) get their product pages and colours prepared.
4. **The collection page:** its code and the default photo of every product. Opening the collection page is then instant.
5. **Desktop only:** everything else.

### Workflow B: the visitor opens the collection page first

1. **The product list and the collection page code** download together (see change 3). A return visitor already has the product list saved from the last visit.
2. **On screen:** the default photos of the visible cards. Urgent.
3. **One tap away:** the product pages and other colours of the visible cards.
4. **One scroll away:** the next cards' default photos, then their product pages and colours. This keeps moving as the visitor scrolls, so the card they tap, first or last, is always prepared.
5. **The rest:** the default photo of every product, then the home page's code and hero, so going to home is instant too.
6. **Desktop only:** everything else.

### Workflow C: the visitor opens a product page first (for example, a link shared on Instagram)

1. **The product list and the product page code** download together (see change 3).
2. **The main photo** of the product. Urgent.
3. **The rest of this product:** every photo of it, nearest first (see "On any product page").
4. **One tap away:** the related products shown on the page get their product pages prepared.
5. **The rest:** the default photo of every product and the collection page's code, so going "to the collection" is instant.
6. **Desktop only:** everything else.

---

## 2. Split the code by page

**Today:** the whole site is one JavaScript file: 1.26 MB, 347 KB compressed. Every visitor downloads all of it, including the admin panel (over 6,000 lines), checkout and account. Nothing appears until this file has downloaded and started, which takes roughly 1–2 seconds on a mid-range phone on mobile data.

**Change:** split the code by page. Visitors download only what the page they opened needs. The admin, checkout and account code loads only when someone opens those pages. The home, collection and product page code is downloaded in the background by the queue above, so moving between them never waits for code.

**Expected result:** the first download shrinks by roughly half. This is an estimate, not a measurement; measure the file sizes before and after the split.

---

## 3. Ask for the first content from the page's HTML

**Today:** the browser downloads the code, starts the app, and only then asks the server for the hero's heading and photo address (or, on the collection and product pages, the product list). Those steps happen one after another.

`index.html` already has a small script that runs before the code downloads. On return visits it reads the hero photo's address saved from the last visit and starts downloading the photo early. It does not do this for the hero's text, and on a first visit it has nothing saved, so it cannot start the photo either.

**Change:** extend that script so that, on every visit, it asks the server straight away, while the code is still downloading:

- **Home page:** the hero settings (heading and photo address). As soon as the answer arrives it starts downloading the hero photo.
- **Collection page:** the product list. As soon as it arrives it starts downloading the default photos of the first cards.
- **Product page:** the product list too. As soon as it arrives it starts downloading that product's main photo.

When the app starts it uses the answer that is already there instead of asking again.

- **Nothing is hardcoded.** The script asks the same server address the app uses, and admin changes still show up.
- **First visit:** the server answer and the first photos overlap with the code download instead of waiting for it.
- **Return visit:** the app starts with the server's current content, not the saved one, so a hero changed in admin never shows the old one first. When nothing has changed (almost every visit), the photos are already in the browser's cache and appear instantly.
- **Slow server:** if the answer hasn't arrived shortly after the app starts, the saved content is shown and kept for the rest of the visit (see the rule at the top).

**Expected result:** by the time the app starts, the first content is usually already there, so the page appears right after the code has loaded, and it is always up to date.
