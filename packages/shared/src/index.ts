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
  /** Parent request; when writing, pass just `{ id }`. */
  request?: { id: string };
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

/** 표준 단어: a word or abbreviation with its formal name. */
export interface StandardWordRecord {
  id: string;
  word: string;
  formalName?: string;
  description?: string;
  category: string;
  updatedAt: Date;
  updatedBy: string;
}

/** 표준 용어: a business term built from words, with its definition. */
export interface StandardTermRecord {
  id: string;
  name: string;
  abbreviation?: string;
  definition: string;
  category: string;
  /** Names of related 표준 단어, separated by commas. */
  relatedWords?: string;
  updatedAt: Date;
  updatedBy: string;
}

/** 표준 계산식: a named measure and how it is calculated. */
export interface StandardFormulaRecord {
  id: string;
  name: string;
  title?: string;
  unit?: string;
  expression?: string;
  description?: string;
  /** Names of the formulas this one uses, separated by commas. */
  dependsOn?: string;
  notes?: string;
  category: string;
  /** Indentation level in the calculation hierarchy (0 = top). */
  depth: number;
  /** Position in the hierarchy listing; lower comes first. */
  sortOrder: number;
  updatedAt: Date;
  updatedBy: string;
}

export type UniversalAppSchema = {
  DataRequest: DataRequestRecord;
  RequestComment: RequestCommentRecord;
  StandardWord: StandardWordRecord;
  StandardTerm: StandardTermRecord;
  StandardFormula: StandardFormulaRecord;
};
