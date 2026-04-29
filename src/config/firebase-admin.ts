import * as fs from 'fs';

export type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export type FirebaseServiceAccountSource = {
  serviceAccount: FirebaseServiceAccount;
  source: string;
};

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, '\n');
}

function isFirebaseServiceAccount(
  value: unknown,
): value is FirebaseServiceAccount {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.project_id === 'string' &&
    typeof candidate.client_email === 'string' &&
    typeof candidate.private_key === 'string'
  );
}

function normalizeServiceAccount(
  serviceAccount: FirebaseServiceAccount,
): FirebaseServiceAccount {
  return {
    project_id: serviceAccount.project_id,
    client_email: serviceAccount.client_email,
    private_key: normalizePrivateKey(serviceAccount.private_key),
  };
}

function parseServiceAccountJson(
  rawJson: string,
  source: string,
): FirebaseServiceAccountSource {
  const parsed = JSON.parse(rawJson);
  if (!isFirebaseServiceAccount(parsed)) {
    throw new Error(
      `${source} must be a Firebase Admin SDK service account JSON with project_id, client_email, and private_key`,
    );
  }

  return {
    serviceAccount: normalizeServiceAccount(parsed),
    source,
  };
}

export function readFirebaseServiceAccount(
  env: NodeJS.ProcessEnv = process.env,
): FirebaseServiceAccountSource | null {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccountJson(
      env.FIREBASE_SERVICE_ACCOUNT_JSON,
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );
  }

  const serviceAccountPath =
    env.FIREBASE_SERVICE_ACCOUNT_PATH ?? env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    return parseServiceAccountJson(
      fs.readFileSync(serviceAccountPath, 'utf-8'),
      serviceAccountPath,
    );
  }

  if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      serviceAccount: normalizeServiceAccount({
        project_id: env.FIREBASE_PROJECT_ID,
        client_email: env.FIREBASE_CLIENT_EMAIL,
        private_key: env.FIREBASE_PRIVATE_KEY,
      }),
      source: 'FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY',
    };
  }

  return null;
}
