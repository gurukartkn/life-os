// How the signed-in user is shown in the shell and on /profile. The display name
// lives in Supabase Auth user_metadata.display_name; without one it is the part of
// the email before the @.
export type UserIdentity = { email: string; displayName: string };

export function displayNameFor(email: string, metadataName?: unknown): string {
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return email.split("@")[0] || email;
}

// Up to two initials for the avatar disc: first and last word of a name with spaces,
// otherwise the first two parts of an email-like handle ("jane.doe" → "JD").
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  const handle = (words[0] ?? "").split("@")[0];
  const parts = handle.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : handle.slice(0, 2);
  return letters.toUpperCase() || "?";
}
