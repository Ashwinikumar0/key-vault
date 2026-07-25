export const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  workspace_name: string;
  created_at: string;
}

export interface Secret {
  id: string;
  workspace_id: string;
  secret_name: string;
  encrypted_value: string;
  iv: string;
  created_at: string;
}

export type SecretItemType = "login" | "connection" | "api" | "certificate" | "note";

export interface CustomField {
  name: string;
  value: string;
  type: "secret" | "plaintext";
}

export interface SecretPayload {
  itemType: SecretItemType;
  fields: CustomField[];
}

export interface UserStat {
  user_id: string;
  email: string;
  secret_count: number;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
  temporary_password: string;
}
