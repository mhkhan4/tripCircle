import { supabase } from './supabase';

export async function ensureSoloGroup(userId: string, userFirstName: string): Promise<string> {
  // Check for an existing solo group the user owns
  const { data: existing } = await supabase
    .from('group_members')
    .select('group:groups!inner(id, is_solo)')
    .eq('user_id', userId)
    .eq('group.is_solo', true)
    .maybeSingle();

  if (existing?.group) {
    return (existing.group as any).id as string;
  }

  // Create a new solo group
  const groupId = crypto.randomUUID();
  const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const name = `${userFirstName}'s Solo Trips`;

  const { error: groupError } = await supabase
    .from('groups')
    .insert({ id: groupId, name, invite_code, created_by: userId, is_solo: true, is_discoverable: false });
  if (groupError) throw groupError;

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'admin' });
  if (memberError) throw memberError;

  return groupId;
}
