import Link from "next/link";
import type { Metadata } from "next";
import { BannerArt } from "@/components/ui/BannerArt";

export const metadata: Metadata = {
  title: "Blog — bazar.in",
  description:
    "Guides on buying and selling safely, spotting scams, pricing your listing and meeting buyers — from the bazar.in team.",
};

export const dynamic = "force-static";

/**
 * Posts live here rather than in a CMS. There are few enough of them that a
 * typed array is simpler to maintain than a database, and it keeps the page
 * fully static — no query, no loading state.
 */
type Post = {
  id: string;
  tag: string;
  emoji: string;
  title: string;
  excerpt: string;
  body: string[];
  readMins: number;
  accent: string;
};

const POSTS: Post[] = [
  {
    id: "spot-a-fake-listing",
    tag: "Safety",
    emoji: "🕵️",
    title: "How to spot a fake listing in under a minute",
    excerpt:
      "Most scams share one tell: the seller never had the item. Here's how to catch that before you've lost anything.",
    readMins: 4,
    accent: "#ff8a7a",
    body: [
      "Almost every marketplace scam works the same way. The seller doesn't own the item — they've taken photos from somewhere else and are hoping you pay before you notice. Once you know that, spotting them gets much easier.",
      "Start with the photos. Are they too clean? Studio lighting, a white background, or a picture that looks like it came from a product page usually means it did. Real listings look like someone's living room, because they were taken in one.",
      "Then check consistency. Does the same photo appear on other listings? Is the background different in each shot, as if they were collected from different places? A genuine seller can photograph the item from any angle you ask for — a scammer can't.",
      "Finally, watch the pressure. 'Someone else is interested', 'pay a token to hold it', 'I'm travelling so I'll courier it' — these all exist to get money moving before you meet. A real seller near you has no reason to rush.",
      "The simplest defence costs nothing: ask for a fresh photo of the item with today's date written on a slip of paper next to it. Anyone who actually has the item can do that in thirty seconds.",
    ],
  },
  {
    id: "price-your-listing",
    tag: "Selling",
    emoji: "💰",
    title: "Pricing your listing so it actually sells",
    excerpt:
      "The most common mistake isn't pricing too high — it's pricing without checking what similar items went for.",
    readMins: 5,
    accent: "#fbbf24",
    body: [
      "Before you pick a number, search your own item on the platform. Look at what's listed near you, and pay more attention to what's disappeared than what's still sitting there. Listings that linger for weeks are usually priced wrong.",
      "As a rough guide, most used electronics sell for 45–60% of their current retail price if they're in good condition with the box. Furniture drops faster — often 30–40%. Vehicles depend far more on service history than age.",
      "Be honest about condition in the price rather than in the description. A scratched phone priced like a mint one won't sell, and every buyer who travels to see it and walks away costs you an afternoon.",
      "Leave a small margin for negotiation, but not a big one. Inflating by 40% because 'they'll bargain' mostly just filters out the serious buyers before they message you.",
      "If you've had no messages in a week, it's the price — not the photos, not the timing. Drop it once, meaningfully, rather than repeatedly by small amounts.",
    ],
  },
  {
    id: "meeting-safely",
    tag: "Safety",
    emoji: "📍",
    title: "Meeting a stranger to buy something: a practical guide",
    excerpt:
      "Public, daylight, and never alone with cash. The rules are simple, and they work.",
    readMins: 4,
    accent: "#7dd3fc",
    body: [
      "Pick the location yourself, and make it busy. A metro station entrance, a mall food court, outside a bank — anywhere with people and cameras. If a seller insists on their home or a quiet spot, suggest an alternative. Their reaction tells you a lot.",
      "Go in daylight. Not because evenings are inherently dangerous, but because you need to actually see what you're buying. Scratches, screen damage and rust all hide well under streetlights.",
      "Tell someone where you're going and roughly when you'll be back. It takes ten seconds and it's the single most useful thing you can do.",
      "Inspect before you pay, always. Turn the phone on. Start the bike. Open the laptop. Check the thing does what it's supposed to do while you're both still standing there.",
      "Carry the amount you agreed, not more. And if anything feels wrong when you arrive — the item isn't as described, there are more people than expected, the story has changed — you're allowed to simply leave. No deal is worth ignoring that feeling.",
    ],
  },
  {
    id: "photos-that-sell",
    tag: "Selling",
    emoji: "📸",
    title: "Photos that sell: what buyers actually want to see",
    excerpt:
      "Good photos aren't about a good camera. They're about answering the questions a buyer would ask.",
    readMins: 4,
    accent: "#a3e635",
    body: [
      "Buyers are looking for reasons to trust you. Every photo should remove a doubt, not create one.",
      "Shoot in daylight near a window, never with flash. Flash flattens everything and makes a clean item look grimy. Natural light shows true colour, which matters more than sharpness.",
      "Take more angles than feel necessary — front, back, both sides, and close-ups of anything worn. Showing a scratch honestly builds far more confidence than hiding it and having the buyer find it in person.",
      "Include the details buyers hunt for: the charging port, the serial or IMEI plate, the box and accessories, the odometer, the tag inside the garment. These are the exact things people message to ask about.",
      "Wipe the item first. It takes a minute and it's the highest-return thing you can do — a clean item photographs as a well-kept one.",
    ],
  },
  {
    id: "advance-payment",
    tag: "Safety",
    emoji: "🚩",
    title: "Why we'll never tell you to pay in advance",
    excerpt:
      "Advance payment is the single most common way people lose money on marketplaces. Here's the reasoning.",
    readMins: 3,
    accent: "#f472b6",
    body: [
      "If you're buying from someone in your own city, there is no situation that requires paying before you meet. None. Every explanation for why you must — a deposit to hold it, courier charges, a booking fee, an unavailable relative — is a story built to move money before you can verify anything.",
      "The reason it works is urgency. The item is priced well, someone else is supposedly interested, and a small advance feels like a reasonable risk. That's the design, not a coincidence.",
      "Once money leaves your account to a stranger, recovering it is genuinely hard. Payment apps are built for speed, not reversal.",
      "So the rule is simple, and it has no exceptions: see the item, check the item, then pay. If a seller won't meet, they aren't a seller.",
    ],
  },
  {
    id: "what-sells-fastest",
    tag: "Selling",
    emoji: "⚡",
    title: "What sells fastest second-hand — and what doesn't",
    excerpt:
      "Some categories move in days, others sit for months. Knowing which is which saves a lot of frustration.",
    readMins: 4,
    accent: "#c084fc",
    body: [
      "Phones and laptops move fastest, especially recent models in working condition. There's constant demand and buyers know exactly what they're worth, which makes decisions quick.",
      "Two-wheelers sell well when the paperwork is clean. A bike with full service records and a clear transfer will outsell an identical one without them, at a higher price.",
      "Furniture is slower and heavily local — buyers need to collect it, so your effective market is a few kilometres wide. Price accordingly and be flexible on pickup.",
      "Baby and kids' items move surprisingly quickly, because they're outgrown rather than worn out. Parents know this and actively look second-hand.",
      "The slowest categories are usually niche hobby gear and anything requiring installation. They sell eventually, but to a specific person who has to happen to be looking. Patience matters more than price there.",
    ],
  },
  {
    id: "buying-used-phone",
    tag: "Buying",
    emoji: "📱",
    title: "Buying a used phone: the ten-minute checklist",
    excerpt:
      "Everything worth checking before you hand over money, in the order you should check it.",
    readMins: 5,
    accent: "#5eead4",
    body: [
      "Start with the IMEI. Dial *#06# on the phone and compare it with the box and the bill. If they don't match, or the seller is reluctant, stop there.",
      "Check the screen properly. Open a plain white image and a plain black one full-screen — dead pixels, burn-in and discolouration are almost invisible on a normal home screen but obvious on flat colour.",
      "Test every button and port. Volume, power, both cameras, the flash, the speaker, the mic, the charging port, and the fingerprint or face unlock. It takes two minutes and covers the expensive failures.",
      "Look at battery health if the phone reports it, and be sceptical if it doesn't. A phone that needs a battery within months is worth meaningfully less.",
      "Finally, make sure the previous account is fully signed out before you leave. A phone still linked to someone else's account can be locked remotely, and at that point it's a paperweight.",
    ],
  },
  {
    id: "why-we-built-bazar",
    tag: "Behind the scenes",
    emoji: "🛠️",
    title: "Why we built bazar.in the way we did",
    excerpt:
      "Real-time photo capture, location verification, on-platform chat — every one of these exists for a reason.",
    readMins: 4,
    accent: "#ff8a7a",
    body: [
      "bazar.in started with a specific bad experience: saving up for a second-hand camera, finding a seller with convincing photos, and discovering the photos were stolen and the seller had nothing.",
      "That led to a realisation. Nearly every scam has the same weak point — the scammer cannot produce the item. They can copy a photo, but they can't take a new one.",
      "So the platform is built around that. Listing photos are captured live rather than uploaded from a gallery, so the picture has to be taken with the item present. Location is recorded at the same moment, so the item is where the listing says it is.",
      "We also check whether a photo already exists on someone else's listing, and whether its location and timestamp make sense. Listings that fail those checks go for review rather than straight to the feed.",
      "Chat stays on the platform for the same reason — a conversation that moves to a private number leaves no record if something goes wrong. None of this makes fraud impossible, but it removes the easy version of it, and that's most of it.",
    ],
  },
];

export default function BlogPage() {
  return (
    <div className="bl-page">
      <style>{`
        /* ── BLOG — ink navy + coral ────────────────────────────── */
        .bl-page { background: #f9fafc; }

        .bl-band {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #0b1530 0%, #1b2a5c 52%, #2f4494 100%);
          -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          padding: 56px 0 76px;
        }
        @media(max-width:640px){ .bl-band { padding: 38px 0 56px; } }
        .bl-band-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .bl-band-glow {
          position: absolute; top: -110px; right: -60px; width: 320px; height: 320px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(255,138,122,0.32) 0%, transparent 70%);
          animation: bl-breathe 9s ease-in-out infinite;
        }
        @keyframes bl-breathe { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.15);opacity:1} }
        .bl-band::before {
          content:""; position:absolute; top:0; bottom:0; left:-30%; width:30%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.07), transparent);
          transform: skewX(-18deg); animation: bl-shine 7s ease-in-out infinite;
          pointer-events:none; z-index:1;
        }
        @keyframes bl-shine { 0%{left:-30%} 55%,100%{left:130%} }

        .bl-band-inner { position: relative; z-index: 2; max-width: 1600px; margin: 0 auto; padding: 0 16px; }
        @media(min-width:768px){ .bl-band-inner { padding: 0 32px; } }

        .bl-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
          color: #fff; margin: 0 0 14px; padding: 5px 12px; border-radius: 999px;
          background: rgba(255,138,122,0.18); border: 1px solid rgba(255,138,122,0.42);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        }
        .bl-title {
          font-size: clamp(28px, 5vw, 50px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.03; color: #fff; margin: 0; max-width: 20ch;
          text-shadow: 0 2px 22px rgba(0,0,0,0.45);
          animation: bl-rise 560ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .bl-title em { font-style: normal; color: #ff8a7a; }
        @keyframes bl-rise { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        .bl-sub {
          font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.78);
          margin: 14px 0 0; max-width: 56ch; line-height: 1.55;
          animation: bl-rise 560ms cubic-bezier(0.22,1,0.36,1) 110ms both;
        }

        .bl-wrap { max-width: 1100px; margin: -30px auto 0; padding: 0 16px 90px; position: relative; z-index: 2; }
        @media(min-width:768px){ .bl-wrap { padding: 0 32px 100px; } }

        /* ── Post cards ── */
        .bl-grid { display: grid; gap: 18px; }
        @media(min-width:768px){ .bl-grid { grid-template-columns: 1fr 1fr; } }

        .bl-post {
          background: #fff; border-radius: 22px; border: 1px solid #eceef3;
          box-shadow: 0 10px 34px rgba(11,21,48,0.06);
          padding: 26px 24px; position: relative; overflow: hidden;
          animation: bl-rise 600ms cubic-bezier(0.22,1,0.36,1) both;
          transition: transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms ease, border-color 260ms ease;
        }
        .bl-post:nth-child(2){ animation-delay: 60ms; }
        .bl-post:nth-child(3){ animation-delay: 120ms; }
        .bl-post:nth-child(4){ animation-delay: 180ms; }
        .bl-post:nth-child(5){ animation-delay: 240ms; }
        .bl-post:nth-child(6){ animation-delay: 300ms; }
        .bl-post:nth-child(7){ animation-delay: 360ms; }
        .bl-post:nth-child(8){ animation-delay: 420ms; }
        /* A colour bar per post, so the list reads as varied rather than uniform */
        .bl-post::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: var(--pa);
        }
        @media(hover:hover){
          .bl-post:hover {
            transform: translateY(-4px);
            box-shadow: 0 18px 44px rgba(11,21,48,0.11);
            border-color: color-mix(in srgb, var(--pa) 42%, #fff);
          }
        }

        .bl-post-head { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; flex-wrap: wrap; }
        .bl-post-ic {
          width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 19px;
          background: color-mix(in srgb, var(--pa) 15%, #fff);
          border: 1px solid color-mix(in srgb, var(--pa) 32%, #fff);
        }
        .bl-tag {
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
          color: color-mix(in srgb, var(--pa) 78%, #000);
          background: color-mix(in srgb, var(--pa) 13%, #fff);
          padding: 4px 10px; border-radius: 999px;
        }
        .bl-read { font-size: 11.5px; font-weight: 700; color: #94a3b8; margin-left: auto; white-space: nowrap; }

        .bl-post-title { font-size: 19px; font-weight: 900; letter-spacing: -0.035em; color: #0b1530; margin: 0 0 9px; line-height: 1.25; }
        .bl-excerpt { font-size: 14px; color: #475569; margin: 0 0 15px; line-height: 1.6; font-weight: 500; }

        .bl-body { border-top: 1px solid #f1f3f7; padding-top: 15px; }
        .bl-body p { font-size: 14.2px; line-height: 1.72; color: #3f4b5e; margin: 0 0 12px; }
        .bl-body p:last-child { margin-bottom: 0; }

        /* ── Closing note ── */
        .bl-note {
          margin-top: 30px; border-radius: 22px; padding: 30px 26px; text-align: center;
          background: linear-gradient(135deg, #0b1530 0%, #1b2a5c 55%, #2f4494 100%);
        }
        .bl-note-h { font-size: 21px; font-weight: 900; letter-spacing: -0.035em; color: #fff; margin: 0 0 8px; }
        .bl-note-h em { font-style: normal; color: #ff8a7a; }
        .bl-note-p { font-size: 14.5px; color: rgba(255,255,255,0.76); margin: 0 0 20px; line-height: 1.6; }
        .bl-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 12px 24px; border-radius: 999px; text-decoration: none;
          font-size: 14px; font-weight: 800; letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ff8a7a, #fbbf24); color: #2b1206;
          box-shadow: 0 8px 24px rgba(255,138,122,0.4);
          transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease;
        }
        @media(hover:hover){ .bl-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(255,138,122,0.55); } }

        @media(prefers-reduced-motion:reduce){
          .bl-band-glow, .bl-band::before, .bl-title, .bl-sub, .bl-post, .bl-btn {
            animation: none !important; transition: none !important;
          }
        }
      `}</style>

      {/* ── BANNER ── */}
      <div className="bl-band">
        <BannerArt variant="topo" tint="#ff8a7a" tint2="#7dd3fc" id="blog" />
        <div className="bl-band-grid" aria-hidden="true" />
        <div className="bl-band-glow" aria-hidden="true" />
        <div className="bl-band-inner">
          <p className="bl-eyebrow">✍️ Blog</p>
          <h1 className="bl-title">
            Buying and selling, <em>done properly</em>
          </h1>
          <p className="bl-sub">
            Practical guides on spotting scams, pricing what you&apos;re selling, meeting
            buyers safely, and how bazar.in actually works underneath.
          </p>
        </div>
      </div>

      <div className="bl-wrap">
        <div className="bl-grid">
          {POSTS.map((post) => (
            <article
              key={post.id}
              className="bl-post"
              style={{ ["--pa" as string]: post.accent }}
            >
              <div className="bl-post-head">
                <span className="bl-post-ic" aria-hidden="true">{post.emoji}</span>
                <span className="bl-tag">{post.tag}</span>
                <span className="bl-read">{post.readMins} min read</span>
              </div>
              <h2 className="bl-post-title">{post.title}</h2>
              <p className="bl-excerpt">{post.excerpt}</p>
              <div className="bl-body">
                {post.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="bl-note">
          <p className="bl-note-h">
            Got something <em>worth writing about?</em>
          </p>
          <p className="bl-note-p">
            If you&apos;ve run into a scam we haven&apos;t covered, or found a trick worth
            sharing, tell us and we&apos;ll add it here.
          </p>
          <Link href="/contact" className="bl-btn">
            Get in touch
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}