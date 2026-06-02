// Friends / social layer (cloud only). All cross-user reads go through
// SECURITY DEFINER RPCs that verify an accepted friendship server-side.
import { getSupabase } from "@/lib/supabase";

export interface Friend {
  id: string;
  username: string | null;
  displayName: string;
  mascot: "turtley" | "shelldon";
  streak: number;
  trekStreak: number;
  sharedCount: number;
  lastShared: { date: string; photoUrl?: string; turtleName?: string } | null;
}
export interface PendingRequest { id: string; from: string; username: string | null; displayName: string; mascot: "turtley" | "shelldon" }
export interface OutgoingRequest { id: string; to: string; username: string | null; displayName: string }
export interface FriendTurtle { date: string; photoUrl?: string; turtleName?: string; mood?: string; state: string }
export interface Cheer { id: string; emoji: string; from: string; username: string | null; displayName: string; createdAt: string; seen: boolean }

export const CHEER_EMOJI = ["👏", "💚", "🔥", "🐢", "✨", "🌸"];

export interface GoalMember { id: string; displayName: string; mascot: "turtley" | "shelldon"; status: "pending" | "accepted"; contribution: number }
export interface GroupGoal {
  id: string; title: string; target: number; startDate: string;
  myStatus: "pending" | "accepted"; createdBy: string;
  members: GoalMember[]; total: number;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud not configured");
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const setUsername = (username: string) => rpc<{ username: string }>("srv_set_username", { p_username: username });
export const sendFriendRequest = (handle: string) => rpc<{ ok: boolean }>("srv_send_friend_request", { p_handle: handle });
export const respondFriendRequest = (id: string, accept: boolean) => rpc<{ ok: boolean }>("srv_respond_friend_request", { p_id: id, p_accept: accept });
export const removeFriend = (friendId: string) => rpc<{ ok: boolean }>("srv_remove_friend", { p_friend: friendId });
export const listFriends = () => rpc<Friend[]>("srv_list_friends");
export const pendingRequests = () => rpc<{ incoming: PendingRequest[]; outgoing: OutgoingRequest[] }>("srv_pending_requests");
export const friendTurtles = (friendId: string) => rpc<FriendTurtle[]>("srv_friend_turtles", { p_friend: friendId });
export const sendCheer = (friendId: string, emoji: string) => rpc<{ ok: boolean }>("srv_send_cheer", { p_friend: friendId, p_emoji: emoji });
export const listCheers = () => rpc<{ unseen: number; cheers: Cheer[] }>("srv_list_cheers");
export const createGroupGoal = (friendId: string, title: string, target: number) => rpc<{ id: string }>("srv_create_group_goal", { p_friend: friendId, p_title: title, p_target: target });
export const respondGroupGoal = (goalId: string, accept: boolean) => rpc<{ ok: boolean }>("srv_respond_group_goal", { p_goal: goalId, p_accept: accept });
export const leaveGroupGoal = (goalId: string) => rpc<{ ok: boolean }>("srv_leave_group_goal", { p_goal: goalId });
export const listGroupGoals = () => rpc<GroupGoal[]>("srv_list_group_goals");

/** Toggle a turtle entry's "shared with friends" flag (own entry; RLS-guarded). */
export async function setEntryShared(date: string, shared: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = (await sb.auth.getUser()).data.user?.id;
  if (!uid) return;
  const { error } = await sb.from("turtle_entry").update({ shared }).eq("user_id", uid).eq("entry_date", date);
  if (error) throw error;
}

/** Friendly message for the known server error codes. */
export function friendErr(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("NO_SUCH_USER")) return "No one has that handle yet 🐢";
  if (m.includes("CANNOT_FRIEND_SELF")) return "You can't friend yourself! 😄";
  if (m.includes("ALREADY_REQUESTED")) return "You're already connected or have a pending request.";
  if (m.includes("USERNAME_TAKEN")) return "That handle is taken — try another.";
  if (m.includes("BAD_USERNAME")) return "Handles are 3–20 letters, numbers or _.";
  if (m.includes("NO_REQUEST")) return "That request is no longer available.";
  if (m.includes("NOT_FRIENDS")) return "You need to be friends first 🐢";
  if (m.includes("TOO_SOON")) return "Give them a moment before cheering again 🐢";
  if (m.includes("BAD_TITLE")) return "Give your goal a short name (1–60 chars).";
  return "Something went wrong 🐢";
}
