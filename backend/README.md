# Backend (API)

Plain Node.js (18 or newer), no dependencies. Saves customer requests, approvals, bids, messages and uploaded files.

    npm start          # http://localhost:3000
    npm test           # runs the automatic tests

## Settings (environment variables, see .env.example)
| Name | Meaning |
|---|---|
| `ADMIN_KEY` | Owner password. **Required in production** (the server refuses to start with the test password). |
| `ALLOWED_ORIGINS` | Your website address, e.g. `https://yourname.github.io` (comma separated). `*` = anyone (testing only). |
| `DATA_DIR` | Folder for `db.json` and `uploads/`. Use a persistent disk when hosting. |
| `PORT` | Port number (hosting services set it for you). |

## Endpoints
Public: `GET /api/posts`, `POST /api/submit`, `GET /api/status/:code`, `POST /api/contact`, `POST /api/apply`.
Owner (header `x-admin-key`): `GET /api/admin/data`, `POST /api/admin/decide | post | delete | appdelete | msgdelete`.
Customer phone numbers and emails are never returned by the public endpoints.
Basic protection included: upload type and size limits, rate limits, wrong-password lockout, safe file serving.

## Important
Saved posts and uploads live in `DATA_DIR`. On free hosting plans this folder can be erased when the service restarts or redeploys. Use a persistent disk/volume for real use and back it up.
