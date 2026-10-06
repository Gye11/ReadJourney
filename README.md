# Read Journey

Read Journey is a book-reading tracker for discovering books, managing a personal library, and recording reading progress.

## Technologies

- React and React Router for the web application
- Vite for local development and production builds
- Firebase Authentication for email/password accounts
- Cloud Firestore for the shared book catalog, personal libraries, and reading diaries

## Project references

- Technical specification: <https://docs.google.com/spreadsheets/d/1b-sLAESm4_APTnESC7_Cm9GJLjjDravFrFbS-WNm91g/edit?gid=1060862504#gid=1060862504>
- Figma design: <https://www.figma.com/file/z3m0rdBcEfLTJUBDkAKhWQ/BOOKS-READING?type=design&node-id=18743%3A4973&mode=design&t=Hi1KTaUJ.MoqWXZ7zz-1>

## Run locally

Install the dependencies and start the development server:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the Firebase web app settings from the Firebase Console. `.env.local` is excluded from Git. Firebase web configuration is still delivered to browsers, so protect the project with API-key restrictions, authorized domains, and Firestore security rules; do not put service-account credentials in a frontend app.

Create and preview a production build:

```sh
npm run build
npm run preview
```

The production build is written to `dist/` and uses `/Read.Journey/` as its deployment base path. Local Firebase settings belong in `.env.local`; deployment environments must define the same `VITE_FIREBASE_*` variables.

## Deploy to GitHub Pages

The workflow at `.github/workflows/deploy.yml` builds and deploys `dist/` whenever changes are pushed to `main`; it can also be started manually from the repository's Actions tab. In repository Settings → Pages, set the build/deployment source to **GitHub Actions**.

Before the first deployment, add these six `VITE_FIREBASE_*` values under Settings → Secrets and variables → Actions → Variables (or Secrets): `API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, and `APP_ID`. The workflow accepts either repository variables or secrets. Firebase web-app configuration is included in the public client bundle; never add a Firebase service-account key here. This repository is owned by `Gye11`, so its project Pages URL will be `https://gye11.github.io/ReadJourney/`. Add `gye11.github.io` to Firebase Authentication → Settings → Authorized domains.

## Firebase data model

- `catalog/{bookId}`: shared recommendation documents. Signed-in users can read them; clients cannot write to the catalog.
- `users/{uid}`: the signed-in user's profile document.
- `users/{uid}/books/{bookId}`: books in that user's library and their current progress.
- `users/{uid}/books/{bookId}/readings/{readingId}`: that user's reading sessions.

The React app uses Firebase Authentication for registration, login, and logout. All book, progress, and diary reads/writes use Firestore. There are no Read Journey REST API requests. To populate recommendations, create documents in the `catalog` collection from Firebase Console with `title` (string), `author` (string), `totalPages` (number), and optionally `coverUrl` (string). Catalog writes are intentionally unavailable to client users.

In Firebase Console, create the Firestore database, publish the rules below, and add `localhost` plus the deployed site hostname under Authentication → Settings → Authorized domains. User libraries and reading diaries start empty; existing REST API data is not migrated automatically.

## Firestore security rules

`firestore.rules` allows authenticated users to read the shared catalog and access only documents below their own UID. All other paths and client writes to the catalog are denied. Publish these rules in Firebase Console → Firestore Database → Rules before using the app. Review and extend the rules deliberately if you add collections or fields.
