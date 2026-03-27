import admin from "firebase-admin";

let initialized = false;

function initFirebaseIfNeeded() {
  if (initialized) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!projectId || !encoded) {
    return;
  }

  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  initialized = true;
}

export async function sendPushToTokens(tokens: string[], title: string, body: string, data?: Record<string, string>) {
  if (!tokens.length) {
    return;
  }

  initFirebaseIfNeeded();

  if (!initialized) {
    console.log("[PUSH MOCK]", { tokens, title, body, data });
    return;
  }

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });
}
