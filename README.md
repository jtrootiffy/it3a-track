<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme-banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/readme-banner-light.svg">
    <img src="docs/readme-banner-light.svg" alt="IT3A - TRACK, IT3A ISCS Funds Payment Tracker" width="100%">
  </picture>

  <p>
    <a href="https://it3a-track.vercel.app"><img src="https://img.shields.io/badge/LIVE-it3a--track.vercel.app-001514?style=for-the-badge&amp;labelColor=0A6B62&amp;logo=vercel&amp;logoColor=41EAD4" alt="Live app: it3a-track.vercel.app"></a>
    <img src="https://img.shields.io/badge/FEE-%E2%82%B150-001514?style=for-the-badge&amp;labelColor=0A6B62" alt="Fee: ₱50">
    <img src="https://img.shields.io/badge/NEXT.js-15-001514?style=for-the-badge&amp;labelColor=0A6B62&amp;logo=nextdotjs&amp;logoColor=41EAD4" alt="Next.js 15">
  </p>
</div>

<p align="center">
  <a href="https://it3a-track.vercel.app"><strong>it3a-track.vercel.app</strong></a><br>
  <sub><strong>IT3A ISCS Funds Payment Tracker</strong> · Paid-only public ledger for the ₱50 organizational fund.</sub>
</p>

IT3A - TRACK is the payment tracker for the IT3A organizational fund for the upcoming
ISCS Days. Every student in the section owes a one-time ₱50 contribution. One shared roster
answers two different questions: the class can see who has already paid, and the two
administrators can see who has not.

<p align="center">
  <a href="#what-it-does">What it does</a> ·
  <a href="#design">Design</a> ·
  <a href="#stack">Stack</a>
</p>

**At a glance**

- **Live app:** [it3a-track.vercel.app](https://it3a-track.vercel.app).
- **Who pays:** every student in IT3A.
- **Fee:** ₱50, one-time, for the ISCS Days organizational fund.
- **Public page:** paid students only, their merit numbers, plus the running total collected.
- **Admin dashboard:** the full roster, including unpaid students, remarks, merit numbers, and
  payment history.
- **Administrators:** Dexter Gravoso and Troy Lagahit.
- **Currency:** Philippine peso (₱).

## Why the public page hides unpaid students

Naming a classmate over an unpaid ₱50 before ISCS Days is not the point of this system. The
public page works like a receipt board: it confirms who has paid and shows the fund growing.
The unpaid list is a private working document for the two administrators, who need it to
follow up individually. No enrollment count, unpaid count, percentage, or progress bar is
ever exposed publicly, so the page cannot be used to rank or shame anyone by absence.

---

## What it does

**Public page (`/`)**

- "N Students Paid" and "₱N Collected" headline figures, computed from the database on every request.
- Leaderboard of paid students sorted A-Z, auto-scrolling in a loop of 8 visible rows. Click or hold to pause; search shows a static filtered list.
- Merit number when recorded, green PAID badge, and payment date.
- Search by name or merit number.
- Empty state reads "0 Students Paid" and "₱0 Collected".
- Total enrollment, unpaid counts, percentages, and progress bars are **never** exposed.

**Login (`/login`)**

- One form: username or email, password, Login. Optional show/hide password.
- One generic error for a wrong username or a wrong password.
- No sign-up, no registration link, no public account creation.

**Admin dashboard (`/admin`)**

- Private totals: collected, paid, unpaid, and roster size.
- Full roster with remarks, payment dates, merit numbers, status filter, and search.
- Mark paid / mark unpaid, add, edit, and delete (with a confirmation dialog). Marking paid
  opens a small dialog where an optional merit number can be recorded.
- Payment history: who changed what, and when.
- Sign out clears the session cookies.

**Money rules**

- The fee is fixed at ₱50 per student for the ISCS Days organizational fund and is not stored
  per student.
- `Total Collected = paid_count × 50`, always derived from the rows.
- Marking paid adds ₱50; marking unpaid removes ₱50. There is no stored total to drift.
- A database trigger stamps `payment_date` when a student becomes paid and clears it when
  they are reverted. The history survives in the audit log.
- A merit number is optional. It appears on the public leaderboard, can only exist on a paid
  student, and is cleared when a student is marked unpaid.
- Duplicate names are rejected case- and whitespace-insensitively.

---

## Design

<div align="center">
  <img src="docs/palette.svg" alt="Palette: #FFFFFF canvas, #41EAD4 accent, #001514 ink" width="100%">
</div>

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#FFFFFF` | Page surfaces, with cool neutral steps for layering |
| Accent | `#41EAD4` | PAID state, focus rings, the hero sheen, and primary actions |
| Ink | `#001514` | Type, inverse cards, and the dark canvas |

Dark mode derives its neutrals from the same three colours; the accent never changes. A theme
button beside Admin Login overrides the system preference and remembers the choice on the device.
Motion is limited to entry reveals and collapses under `prefers-reduced-motion`. Cards use 16px
radii, controls use 10px, and figures are set in JetBrains Mono.

---

## Stack

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| UI       | Next.js 15.5 (App Router), React 19, TypeScript              |
| Styling  | Tailwind CSS 4 with custom design tokens                     |
| Data     | Postgres, Row Level Security, Auth                           |
| Hosting  | Vercel (or any Node host that runs Next.js)                  |

---

<div align="center">
  <sub><strong>IT3A - TRACK</strong> · IT3A ISCS Funds Payment Tracker · ₱50 organizational fund for ISCS Days</sub><br>
  <sub><a href="https://it3a-track.vercel.app">it3a-track.vercel.app</a></sub>
</div>
