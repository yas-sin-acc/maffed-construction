# Frontend (website + owner panel)

Plain HTML, CSS and JavaScript. No build step.

    npm start     # preview at http://localhost:5173 (needs the backend running on port 3000)

## Where to change things
| I want to change | Open |
|---|---|
| Colors, fonts, roundness, spacing, banner height | `css/theme.css` (every value is explained) |
| Words in 4 languages, company name, logo, phone, social links, laws, map links | `js/content.js` |
| Backend address | `js/config.js` |
| Pictures (JPG) | `images/` (same file name, or change the path in `content.js`) |

## Pages
- `index.html`: public website. Bids, Laws and Map open from the three-dots menu (next to the alarm button).
- `admin.html`: owner panel (login). Customer requests wait here: **Approve and publish**, **Ask for more info**, or **Reject**. Approved requests appear on the website automatically. The owner can also post directly, add bid documents, law PDFs and map links.
