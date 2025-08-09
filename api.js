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
