export type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export type FirebaseServiceAccountSource = {
  serviceAccount: FirebaseServiceAccount;
  source: string;
};
