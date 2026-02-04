export const GUEST_PROJECT_STORAGE_KEY = "mpdf:guest-project";

export type GuestProject = {
  id: string;
  createdAt: number;
  mode: "guest";
  isPersisted: false;
  ownerId: null;
  sourceIds?: string[];
};
