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
            if (action.type === 'addShift') {
                await addShift(action.payload, true);
            } else if (action.type === 'updateShift') {
                await updateShift(action.payload.id, action.payload.data, true);
            } else if (action.type === 'deleteShift') {
                await deleteShift(action.payload.id, true);
            } else if (action.type === 'addEmployee') {
                await addEmployee(action.payload, true);
            } else if (action.type === 'updateEmployee') {
                await updateEmployee(action.payload.id, action.payload.data, true);
            } else if (action.type === 'deleteEmployee') {
                await deleteEmployee(action.payload.id, true);
            }
        } catch (error) {
            console.error('Failed to sync action:', action, error);
        }
    }
    syncQueue = [];
    saveQueue();
    console.log('Offline sync complete.');
    window.dispatchEvent(new Event('syncComplete'));
}

window.addEventListener('online', syncOfflineChanges);


// --- API Functions ---

export async function getEmployees() {
    const { data, error } = await supabaseClient.from('employees').select('*');
    if (error) console.error('Error fetching employees:', error);
    return { data, error };
}

export async function addPtoRequest(requestData) {
    const { data, error } = await supabaseClient.from('pto_requests').insert([requestData]).select().single();
    if (error) {
        console.error('Error adding PTO request:', error);
    } else if (data) {
        addAuditLog('PTO Request Added', {
            employee_id: data.employee_id,
            details: { pto_request_id: data.id, ...requestData }
        });
    }
    return { data, error };
}

export async function getEmployee(employeeId) {
    const { data, error } = await supabaseClient.from('employees').select('*').eq('id', employeeId).single();
    if (error) console.error('Error fetching employee:', error);
    return { data, error };
}

export async function addEmployee(employeeData, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'addEmployee', payload: employeeData });
        return { data: null, error: { message: 'Offline: Queued employee addition.' }};
    }
    const { data, error } = await supabaseClient.from('employees').insert([employeeData]).select().single();
    if (error) {
        console.error('Error adding employee:', error);
    } else if (data && !isSyncing) {
        addAuditLog('Employee Added', { employee_id: data.id, details: { ...employeeData } });
    }
    return { data, error };
}

export async function updateEmployee(employeeId, employeeData, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'updateEmployee', payload: { id: employeeId, data: employeeData } });
        return { data: null, error: { message: 'Offline: Queued employee update.' }};
    }
    const { data, error } = await supabaseClient.from('employees').update(employeeData).eq('id', employeeId).select().single();
    if (error) {
        console.error('Error updating employee:', error);
    } else if (data && !isSyncing) {
        addAuditLog('Employee Updated', { employee_id: data.id, details: { ...employeeData } });
    }
    return { data, error };
}

export async function deleteEmployee(employeeId, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'deleteEmployee', payload: { id: employeeId } });
        return { data: null, error: { message: 'Offline: Queued employee deletion.' }};
    }
    const { data, error } = await supabaseClient.from('employees').delete().eq('id', employeeId).select().single();
    if (error) {
        console.error('Error deleting employee:', error);
    } else if (data && !isSyncing) {
        addAuditLog('Employee Deleted', { employee_id: data.id, details: { ...data } });
    }
    return { data, error };
}


export async function getShifts() {
    const { data, error } = await supabaseClient.from('shifts').select('*, employees(name)');
    if (error) console.error('Error fetching shifts:', error);
    return { data, error };
}

export async function getShift(shiftId) {
    const { data, error } = await supabaseClient.from('shifts').select('*').eq('id', shiftId).single();
    if (error) console.error('Error fetching shift:', error);
    return { data, error };
}

export async function addShift(shiftData, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'addShift', payload: shiftData });
        return { data: null, error: { message: 'Offline: Queued shift addition.' }};
    }
    const { data, error } = await supabaseClient.from('shifts').insert([shiftData]).select().single();
    if (error) {
        console.error('Error adding shift:', error);
    } else if (data && !isSyncing) {
        addAuditLog('Shift Added', { employee_id: data.employee_id, details: { shift_id: data.id, ...shiftData } });
    }
    return { data, error };
}

export async function updateShift(shiftId, shiftData, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'updateShift', payload: { id: shiftId, data: shiftData } });
        return { data: null, error: { message: 'Offline: Queued shift update.' }};
    }
    const { data, error } = await supabaseClient.from('shifts').update(shiftData).eq('id', shiftId).select().single();
    if (error) {
        console.error('Error updating shift:', error);
    } else if (data && !isSyncing) {
        addAuditLog('Shift Updated', { employee_id: data.employee_id, details: { shift_id: data.id, ...shiftData } });
    }
    return { data, error };
}

export async function deleteShift(shiftId, isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
        addToQueue({ type: 'deleteShift', payload: { id: shiftId } });
        return { data: null, error: { message: 'Offline: Queued shift deletion.' }};
    }
    const { data, error } = await supabaseClient.from('shifts').delete().eq('id', shiftId).select().single();
    if (error) {
        console.error('Error deleting shift:', error);
    } else if (data && !isSyncing) {
        addAuditLog('Shift Deleted', { employee_id: data.employee_id, details: { shift_id: data.id, ...data } });
    }
    return { data, error };
}

export async function getPtoRequests() {
    const { data, error } = await supabaseClient.from('pto_requests').select('*, employees(name)');
    if (error) console.error('Error fetching PTO requests:', error);
    return { data, error };
}

export async function updatePtoRequestStatus(requestId, status) {
    const { data, error } = await supabaseClient
        .from('pto_requests')
        .update({ status: status })
        .eq('id', requestId)
        .select()
        .single();

    if (error) {
        console.error('Error updating PTO request status:', error);
    } else if (data) {
        addAuditLog('PTO Request Updated', {
            employee_id: data.employee_id,
            details: { pto_request_id: data.id, status: status }
        });
    }

    return { data, error };
}

export async function getPtoRequestById(requestId) {
    const { data, error } = await supabaseClient.from('pto_requests').select('*, employees(name)').eq('id', requestId).single();
    if (error) console.error('Error fetching PTO request:', error);
    return { data, error };
}

export async function addAuditLog(action, payload) {
    const logEntry = {
        action: action,
        employee_id: payload.employee_id || null,
        details: payload.details || {}
    };
    const { error } = await supabaseClient.from('audit_log').insert([logEntry]);
    if (error) console.error('Error adding audit log:', error);
}
