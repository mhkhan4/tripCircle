import { supabase } from './supabase';

export async function ensureSoloGroup(userId: string, userFirstName: string): Promise<string> {
  const { data: existingList, error: readError } = await supabase
    .from('groups')
    .select('id')
    .eq('created_by', userId)
    .eq('is_solo', true)
    .limit(1);

  if (readError) throw readError;
  if (existingList && existingList.length > 0) return existingList[0].id;

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
