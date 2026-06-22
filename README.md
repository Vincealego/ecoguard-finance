# EcoGuard Finance

Climate Finance & Resilience Platform for Kenya

EcoGuard Finance helps Kenyan individuals, farmers, businesses, and communities access
sustainable financing while improving resilience against climate risks. The platform
connects a Kenya-focused climate risk engine directly to a green financing marketplace,
so that applicants and institutions can move from understanding risk to securing
financing in one workflow.

## Project Overview

EcoGuard Finance is a full-stack web application with three connected systems:

- A **green financing marketplace** offering six sustainable financing products covering
  solar energy, electric mobility, climate-smart agriculture, water security, climate
  resilient housing, and waste-to-energy projects.
- A **Kenya Climate Intelligence Engine** that scores flood, drought, storm, and wildfire
  risk across Kenyan counties and recommends financing products suited to each risk
  profile.
- An **institutional admin portal**, fully separated from the public application, where
  authorized reviewers manage applications, monitor portfolio performance, and view
  analytics.

## Features

- Five-step financing application workflow: Personal Information, Project Information,
  Location Information, Climate Impact Assessment, and Review & Submit.
- A seven-stage application status pipeline (Submitted, Under Review, Credit Assessment,
  Climate Assessment, Approved, Funded, Rejected) displayed as a visual timeline.
- County-level climate risk profiles with probability scores, risk levels, forecast
  confidence, and recommended protective actions.
- Automatic financing recommendations based on a county's elevated climate risks.
- A user dashboard summarizing applications, climate alerts, and cumulative climate
  impact (CO2 reduction, water saved, jobs created), visualized with Recharts.
- A role-restricted admin portal at dedicated routes (/admin/dashboard,
  /admin/applications, /admin/climate, /admin/analytics, /admin/users) for
  application review, portfolio analytics, and user oversight.
- Firebase Authentication with Firestore-backed role authorization. No hardcoded
  passwords, demo credentials, or passcodes are used anywhere in the application.

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Lucide React Icons, Recharts

**Backend:** Firebase Authentication, Firestore Database, Firebase Storage

**Deployment:** Vercel

## Installation

```bash
git clone <repository-url>
cd ecoguard-finance
npm install
```

Copy the environment template and fill in your Firebase project credentials:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

The application will not function without a configured Firebase project. See
Firebase Setup below.

## Firebase Setup

1. Create a project at console.firebase.google.com.
2. Under Build > Authentication > Sign-in method, enable the Email/Password provider.
3. Under Build > Firestore Database, create a database in production mode.
4. Apply the following security rules (Firestore > Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isAdmin() ||
        (isSignedIn() && request.auth.uid == userId && request.resource.data.role == resource.data.role);
    }

    match /applications/{applicationId} {
      allow read: if isSignedIn() &&
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin();
    }
  }
}
```

5. Register a web app under Project Settings > General > Your Apps, then copy the
   configuration values into .env.local (see .env.example for the required keys).

### Assigning the administrator role

There is no client-facing way to create an administrator account, by design. New
accounts always register with the "applicant" role. To grant administrator access:

1. Have the person register a normal account through the application.
2. In the Firebase console, open Firestore Database and locate the "users" collection.
3. Open the document keyed by that user's Firebase Authentication UID.
4. Change the "role" field from "applicant" to "admin", then save.
5. The Admin Portal link will appear in their navigation bar after their next sign-in.

## Deployment

The application deploys to Vercel as a static single-page application.

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, create a new project from the repository. Vercel detects the Vite
   framework preset automatically.
3. Under Project Settings > Environment Variables, add every variable listed in
   .env.example with your Firebase project's values.
4. Deploy. The included vercel.json rewrite rule ensures client-side routing works
   correctly on page refresh and direct navigation.

For a custom domain, configure it under Project Settings > Domains after the first
successful deployment.
