# UstaJi Deployment Guide: Local to GCP Production

This guide outlines exactly what is currently deployed, what is missing, and the step-by-step process required to get your UstaJi application ready for production sharing via an APK.

## 1. Current State of the Codebase

**Backend (Server)**
- ❌ **Not Deployed:** The server is only configured to run locally (`localhost:3000` or `0.0.0.0`).
- ❌ **Missing Cloud Configurations:** There is no `Dockerfile` or App Engine `app.yaml` file to tell Google Cloud how to host it.
- ✅ **Features Complete:** The Gemini AI integrations, endpoints, and data mocking are set up properly.
- 🔑 **Dependencies:** It relies on `.env` (Gemini API key) and `firebase-service-account.json` (Firebase Auth).

**Mobile App (Frontend)**
- ❌ **Points to Localhost:** In `mobile/src/services/api.ts`, the app dynamically resolves your computer's local IP address (via Expo constants) to talk to the backend. If you build the APK right now, it will crash or fail to load for anyone not on your local WiFi.
- ✅ **UI Complete:** The role-based UI and themes are set.

---

## 2. What Needs to Be Done (The Plan)

To make the APK work on anyone's phone anywhere in the world, we must execute the following steps:

1. **Create a `Dockerfile`** for the Node.js Express backend.
2. **Deploy the backend to Google Cloud Run**, which will give us a permanent public URL (e.g., `https://ustaji-api-abc.a.run.app`).
3. **Set Cloud Environment Variables** so the deployed server has access to your Gemini API Key and Firebase credentials.
4. **Update the Mobile App's API Configuration** to point to the new Google Cloud public URL instead of your local IP.
5. **Generate the APK** using Expo (`eas build` or `npx expo run:android`).

---

## 3. Step-by-Step Execution Guide

We will proceed step-by-step. I will help you automate and write the code for each step.

### Step 1: Containerizing the Backend
We need to create a `Dockerfile` and a `.dockerignore` file in the `server` directory. This tells Google Cloud exactly how to install Node.js, install dependencies, compile the TypeScript code, and run the Express server.

### Step 2: Google Cloud Deployment
Since you don't have the `gcloud` CLI installed locally on your Windows machine, the easiest paths are:
- **Option A:** Install the Google Cloud SDK locally.
- **Option B:** Upload the server folder to a GitHub repository, and link Google Cloud Run to auto-deploy from GitHub.
- **Option C:** Use the Google Cloud Console (in your browser) via Cloud Shell Editor to run the deployment commands.

### Step 3: Setting the Production URL
Once Cloud Run provides the public URL, we will replace the code in `mobile/src/services/api.ts` to look like this:
```typescript
const BASE_URL = 'https://your-cloud-run-url.a.run.app/api';
```

### Step 4: Building the APK
Finally, we will run the `eas build -p android --profile preview` to generate the final `.apk` file that you can share with anyone.

---

**Ready? Let me know, and we will begin Step 1.**
