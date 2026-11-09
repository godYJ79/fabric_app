/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */
export { STAFF_EMAILS, isStaffEmail } from './staff.js';

/** Stored values. Labels shown to users live in the frontend. */
export const REQUEST_STATUSES = ['received', 'analyzing', 'done'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_URGENCIES = ['low', 'normal', 'urgent'] as const;
export type RequestUrgency = (typeof REQUEST_URGENCIES)[number];

export interface RequestCommentRecord {
  id: string;
  body: string;
  /** Author's user id (`claims.sub`). */
  user_id: string;
  authorEmail: string;
  createdAt: Date;
  /** Owner of the parent request, copied at creation so a requester can read comments on their own request. */
  request_owner_id: string;
  request?: DataRequestRecord;
}

export interface DataRequestRecord {
  id: string;
  title: string;
  symptom?: string;
  targetTable: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  /** Requester's user id (`claims.sub`). */
  user_id: string;
  requesterEmail: string;
  createdAt: Date;
  comments?: RequestCommentRecord[];
}

export type UniversalAppSchema = {
  DataRequest: DataRequestRecord;
  RequestComment: RequestCommentRecord;
};
