# Final polish

Features that are useful but not needed to run the shop. Build them after the core order flow is finished.

## Analytics tab in the admin

Decided 6 October 2026: build this as an admin tab, not Google Analytics. It is an extension, so it waits here.

### What it shows

- Visitors and unique visitors per day, week, month
- Orders per day, and the funnel: viewed a product → added to cart → opened checkout → placed an order
- Most viewed and most added products
- What people type into search
- Phone vs computer
- Where visitors came from: Instagram, TikTok, Google, direct, AI assistants (ChatGPT, Claude, Perplexity)
- How often search and AI crawlers read the site (counted in `YarneFront/scripts/server.mjs`)

### Rules it must follow

**It must not load the server.**
- One small row per event, written without making the page wait
- Events are sent from the browser in the background (`navigator.sendBeacon`), never blocking a page or an order
- The admin reads pre-summed daily totals, not raw rows
- Raw rows older than about 90 days are deleted; daily totals are kept
- The endpoint is rate limited, and crawler hits are counted separately so they do not inflate visitor numbers

**It must not need a cookie banner.**
- No cookies, no localStorage identifiers, nothing stored on the visitor's device for tracking
- No IP addresses or personal data saved
- Unique visitors are counted with a hash of IP + browser + a secret that changes every day, so a person cannot be followed from one day to the next and the hash cannot be turned back into an IP
- Nothing is sent to another company
- Check with a lawyer before launch if this matters to you. The design above is the same approach used by cookieless tools such as Plausible, which is built specifically so that no consent banner is required. Ukraine's personal data law still applies to the order data (name, phone, email), so the site needs a privacy page regardless of analytics.

### Cloudflare numbers

Network traffic, countries, unique visitors and bot traffic already exist for free in the Cloudflare dashboard for `yarne-acc.com` (Analytics & Logs). Nothing has to be built to see them.

Optional later: pull the country and traffic totals into the admin tab through Cloudflare's GraphQL Analytics API, so everything is on one screen. Needs a read-only Cloudflare API token stored as a backend secret.

### Only if paid ads start

Instagram and TikTok ads need their own tracking pixel. That does store identifiers on the device, so it needs a consent banner and a cookie section on the privacy page.
