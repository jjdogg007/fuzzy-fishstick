const SUPABASE_URL = 'https://ulefvfpvgfdavztlwmpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWZ2ZnB2Z2ZkYXZ6dGx3bXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTIzMDksImV4cCI6MjA3MDA2ODMwOX0.Se8nQg3BZUAYnt3bahw7iNePXm8G3X5PbH83XHY8edo';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Offline Queue ---
let syncQueue = getQueue();

function getQueue() {
    return JSON.parse(localStorage.getItem('syncQueue')) || [];
}

function saveQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
}

function addToQueue(action) {
    syncQueue.push(action);
    saveQueue();
}

async function syncOfflineChanges() {
    const queue = getQueue();
    if (queue.length === 0) {
        return;
    }

    console.log(`Syncing ${queue.length} offline changes...`);
    for (const action of queue) {
        try {
            if (action.type === 'add') {
                await addShift(action.payload, true);
            } else if (action.type === 'update') {
                await updateShift(action.payload.id, action.payload.data, true);
            } else if (action.type === 'delete') {
                await deleteShift(action.payload.id, true);
            }
        } catch (error) {
            console.error('Failed to sync action:', action, error);
            // In a real app, you would have more robust error handling here.
        }
    }
    syncQueue = [];
    saveQueue();
    console.log('Offline sync complete.');
    // We should probably re-render the UI after sync. This needs to be handled in ui.js
    window.dispatchEvent(new Event('syncComplete'));
}

window.addEventListener('online', syncOfflineChanges);


// --- API Functions ---

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

export async function getShift(shiftId) {
    console.log(`Fetching shift ${shiftId}...`);
    const { data, error } = await supabaseClient
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

    if (error) {
        console.error('Error fetching shift:', error);
        return null;
    }

    return data;
}

export async function addAuditLog(action, payload) {
    const logEntry = {
        action: action,
        employee_id: payload.employee_id || null,
        details: payload.details || {}
    };

    console.log('Adding audit log:', logEntry);
    const { error } = await supabaseClient
        .from('audit_log')
        .insert([logEntry]);

    if (error) {
        console.error('Error adding audit log:', error);
    }
}

export async function updateShift(shiftId, shiftData, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'update', payload: { id: shiftId, data: shiftData } });
        console.log('Offline: Queued shift update.');
        return;
    }

    console.log(`Updating shift ${shiftId} in Supabase:`, shiftData);
    const { data, error } = await supabaseClient
        .from('shifts')
        .update(shiftData)
        .eq('id', shiftId)
        .select()
        .single();

    if (error) {
        console.error('Error updating shift:', error);
        return null;
    }

    if (data && !isSyncing) { // Don't log audit entries for sync operations
        addAuditLog('Shift Updated', {
            employee_id: data.employee_id,
            details: { shift_id: data.id, ...shiftData }
        });
    }

    return data;
}

export async function deleteShift(shiftId, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        // When offline, we don't have the full shift object to log,
        // so we'll just log the ID. A better implementation would
        // fetch the object from local cache if available.
        addToQueue({ type: 'delete', payload: { id: shiftId } });
        console.log('Offline: Queued shift deletion.');
        return;
    }

    console.log(`Deleting shift ${shiftId} from Supabase`);
    const { data, error } = await supabaseClient
        .from('shifts')
        .delete()
        .eq('id', shiftId)
        .select()
        .single();

    if (error) {
        console.error('Error deleting shift:', error);
        return null;
    }

    if (data && !isSyncing) {
        addAuditLog('Shift Deleted', {
            employee_id: data.employee_id,
            details: { shift_id: data.id, ...data }
        });
    }

    return data;
}

export async function addShift(shiftData, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'add', payload: shiftData });
        console.log('Offline: Queued shift addition.');
        return;
    }

    console.log('Adding shift to Supabase:', shiftData);
    const { data, error } = await supabaseClient
        .from('shifts')
        .insert([shiftData])
        .select()
        .single();

    if (error) {
        console.error('Error adding shift:', error);
        return null;
    }

    if (data && !isSyncing) {
        addAuditLog('Shift Added', {
            employee_id: data.employee_id,
            details: { shift_id: data.id, ...shiftData }
        });
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
