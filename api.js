const SUPABASE_URL = 'https://ulefvfpvgfdavztlwmpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWZ2ZnB2Z2ZkYXZ6dGx3bXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTIzMDksImV4cCI6MjA3MDA2ODMwOX0.Se8nQg3BZUAYnt3bahw7iNePXm8G3X5PbH83XHY8edo';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getEmployees() {
    console.log('Fetching employees...');
    const { data, error } = await supabaseClient
        .from('employees')
        .select('*');

    if (error) {
        console.error('Error fetching employees:', error);
        return [];
    }

    return data;
}

export async function updateShift(shiftId, shiftData) {
    console.log(`Updating shift ${shiftId} in Supabase:`, shiftData);
    const { data, error } = await supabaseClient
        .from('shifts')
        .update(shiftData)
        .eq('id', shiftId);

    if (error) {
        console.error('Error updating shift:', error);
        return null;
    }

    return data;
}

export async function deleteShift(shiftId) {
    console.log(`Deleting shift ${shiftId} from Supabase`);
    const { data, error } = await supabaseClient
        .from('shifts')
        .delete()
        .eq('id', shiftId);

    if (error) {
        console.error('Error deleting shift:', error);
        return null;
    }

    return data;
}

export async function addShift(shiftData) {
    console.log('Adding shift to Supabase:', shiftData);
    const { data, error } = await supabaseClient
        .from('shifts')
        .insert([shiftData]);

    if (error) {
        console.error('Error adding shift:', error);
        return null;
    }

    return data;
}

export async function getShifts() {
    console.log('Fetching shifts...');
    const { data, error } = await supabaseClient
        .from('shifts')
        .select(`
            *,
            employees (
                name
            )
        `);

    if (error) {
        console.error('Error fetching shifts:', error);
        return [];
    }

    return data;
}
