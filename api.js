console.log("api.js: Script execution started.");

let supabaseClient;

if (window.supabase) {
    console.log("api.js: window.supabase object found.");
    if (window.SUPABASE_CONFIG) {
        console.log("api.js: window.SUPABASE_CONFIG object found.");
        if (window.SUPABASE_CONFIG.URL && window.SUPABASE_CONFIG.ANON_KEY) {
            console.log("api.js: URL and Key found in config object.");
            try {
                const { createClient } = window.supabase;
                supabaseClient = createClient(window.SUPABASE_CONFIG.URL, window.SUPABASE_CONFIG.ANON_KEY);
                console.log("api.js: Supabase client created successfully.");
            } catch (e) {
                console.error("api.js: Error creating Supabase client:", e);
            }
        } else {
            console.error("api.js: Supabase URL or ANON_KEY is missing from config object.");
        }
    } else {
        console.error("api.js: window.SUPABASE_CONFIG object is missing.");
    }
} else {
    console.error("api.js: window.supabase object is missing. The Supabase CDN script may not have loaded.");
}


// --- Offline Queue ---
let syncQueue = [];
if (typeof window !== 'undefined' && window.localStorage) {
    try {
        syncQueue = getQueue();
        window.addEventListener('online', syncOfflineChanges);
        console.log("api.js: Offline queue system initialized.");
    } catch (e) {
        console.error("api.js: Error initializing offline queue system:", e);
    }
}

function getQueue() {
    const queue = localStorage.getItem('syncQueue');
    return queue ? JSON.parse(queue) : [];
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


// --- API Functions ---

export async function signInUser(email, password) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) console.error('Error signing in:', error);
    return { data, error };
}

export async function signOutUser() {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error('Error signing out:', error);
    return { error };
}

export async function getUserSession() {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return { session: null, error };
    }
    return { session: data.session, error: null };
}

export async function getCurrentUser() {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return { data: null, error: 'No user logged in' };
    }

    const { data, error } = await supabaseClient
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
    }

    return { data: data ? { ...user, ...data } : user, error };
}

export async function getEmployees() {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('employees').select('*');
    if (error) console.error('Error fetching employees:', error);
    return { data, error };
}

export async function addPtoRequest(requestData) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('employees').select('*').eq('id', employeeId).single();
    if (error) console.error('Error fetching employee:', error);
    return { data, error };
}

export async function addEmployee(employeeData, isSyncing = false) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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

export async function addShiftBid(bidData) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('shift_bids').insert([bidData]).select().single();
    if (error) {
        console.error('Error adding shift bid:', error);
    } else if (data) {
        addAuditLog('Shift Bid Added', {
            employee_id: data.employee_id,
            details: { ...bidData }
        });
    }
    return { data, error };
}

export async function getShifts() {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('shifts').select('*, employees(name)');
    if (error) console.error('Error fetching shifts:', error);
    return { data, error };
}

export async function getShift(shiftId) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('shifts').select('*').eq('id', shiftId).single();
    if (error) console.error('Error fetching shift:', error);
    return { data, error };
}

export async function addShift(shiftData, isSyncing = false) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('pto_requests').select('*, employees(name)');
    if (error) console.error('Error fetching PTO requests:', error);
    return { data, error };
}

export async function updatePtoRequestStatus(requestId, status) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
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
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient.from('pto_requests').select('*, employees(name)').eq('id', requestId).single();
    if (error) console.error('Error fetching PTO request:', error);
    return { data, error };
}

export async function addAuditLog(action, payload) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const logEntry = {
        action: action,
        employee_id: payload.employee_id || null,
        details: payload.details || {}
    };
    const { error } = await supabaseClient.from('audit_log').insert([logEntry]);
    if (error) console.error('Error adding audit log:', error);
}

export async function getShiftBids() {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient
        .from('shift_bids')
        .select(`
            *,
            shifts (*),
            employees (name)
        `)
        .eq('status', 'pending');

    if (error) console.error('Error fetching shift bids:', error);
    return { data, error };
}

export async function updateShiftBidStatus(bidId, status) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient
        .from('shift_bids')
        .update({ status: status })
        .eq('id', bidId)
        .select()
        .single();

    if (error) console.error('Error updating shift bid status:', error);
    return { data, error };
}

export async function assignShiftToEmployee(shiftId, employeeId) {
    if (!supabaseClient) throw new Error("Supabase client is not initialized.");
    const { data, error } = await supabaseClient
        .from('shifts')
        .update({ employee_id: employeeId })
        .eq('id', shiftId)
        .select()
        .single();

    if (error) console.error('Error assigning shift to employee:', error);
    return { data, error };
}
