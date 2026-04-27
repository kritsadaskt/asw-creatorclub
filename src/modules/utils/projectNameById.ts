import { supabase } from "./supabase";

export async function getProjectNameById(projectId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
    if (error) {
        console.error('Error getting project name by ID:', error);
        return projectId;
    }
    return data?.name || null;
}