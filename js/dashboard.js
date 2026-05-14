// Initialize Firestore
const db = firebase.firestore();

// Note: Protection is now handled by auth-guard.js. 
// We just need to start the listeners once auth is ready.
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        updateNotificationBadges();
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    });
});

/* -----------------------------
   Modal UI Logic
------------------------------ */
const manageModal = document.getElementById('manage-admins-modal');

// Close modal when clicking on the backdrop
if (manageModal) {
    manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) {
            closeManageAdmins();
        }
    });
}

/* -----------------------------
   Firestore CRUD Logic
------------------------------ */
const adminListBody = document.getElementById('admin-list-body');
const addAdminForm = document.getElementById('add-admin-form');

// View list of all admins
function loadAdmins() {
    adminListBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading...</td></tr>';
    
    // Fetch all users with role 'admin' or 'customer'
    db.collection('users').where('role', 'in', ['admin', 'customer']).onSnapshot((snapshot) => {
        adminListBody.innerHTML = '';
        
        if (snapshot.empty) {
            adminListBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No admin accounts found.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const admin = doc.data();
            const id = doc.id;
            
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer';
            tr.onclick = () => openEditAdmin(id, admin.username, admin.email);
            
            tr.innerHTML = `
                <td class="px-4 py-4 font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span>${admin.username || 'N/A'}</span>
                    <div id="badge-admin-${id}" class="notification-badge hidden">0</div>
                </td>
                <td class="px-4 py-4 text-xs font-bold uppercase text-gray-500">${admin.role}</td>
                <td class="px-4 py-4 text-gray-500 text-right">${admin.email}</td>
            `;
            adminListBody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error loading admins: ", error);
        adminListBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Error loading data: ${error.message}</td></tr>`;
    });
}

// Secondary App for creating users without logging out Main Admin
const secondaryApp = firebase.apps.find(app => app.name === "SecondaryApp") || firebase.initializeApp(firebaseConfig, "SecondaryApp");

// Create new admin
addAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('new-admin-username').value.trim();
    const email = document.getElementById('new-admin-email').value.trim();
    const password = document.getElementById('new-admin-password').value;
    const role = document.getElementById('new-account-role').value;
    const submitBtn = addAdminForm.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...';

    try {
        let newUid;
        try {
            // 1. Try to create the user in Firebase Authentication
            const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
            newUid = userCredential.user.uid;
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                // Email already exists! Let's try to link it by signing in with the provided password
                try {
                    const signInCredential = await secondaryApp.auth().signInWithEmailAndPassword(email, password);
                    newUid = signInCredential.user.uid;
                } catch (signInError) {
                    throw new Error("هذا الإيميل موجود مسبقاً ومحذوف من قاعدة البيانات! لإعادة تفعيله يجب أن تكتب نفس الباسورد القديم حقه. إذا نسيته، لازم تحذفه من Firebase Console.");
                }
            } else {
                throw authError; // Throw other errors normally
            }
        }
        
        // Log out the secondary app immediately
        await secondaryApp.auth().signOut();

        // 2. Add or Re-link their details & role to Firestore
        await db.collection('users').doc(newUid).set({
            username: username,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        addAdminForm.reset();
        alert(`SUCCESS: Account successfully linked/created!\n\nThey can now login with Username: ${username}.`);
    } catch (error) {
        console.error("Error creating account:", error);
        alert('Error creating account:\n\n' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Account';
    }
});

/* -----------------------------
   Edit Admin Modal Logic
------------------------------ */
const editAdminModal = document.getElementById('edit-admin-modal');
const editAdminForm = document.getElementById('edit-admin-form');

window.openEditAdmin = function(id, username, email) {
    document.getElementById('edit-admin-id').value = id;
    document.getElementById('edit-admin-username').value = username || '';
    document.getElementById('edit-admin-email').value = email || '';
    document.getElementById('edit-admin-password').value = '';
    
    // Load this admin's activity
    loadAdminActivity(id);
    
    editAdminModal.classList.remove('hidden');
}

window.closeEditAdmin = function() {
    editAdminModal.classList.add('hidden');
}

editAdminModal.addEventListener('click', (e) => {
    if (e.target === editAdminModal) closeEditAdmin();
});

editAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-admin-id').value;
    const newUsername = document.getElementById('edit-admin-username').value.trim();
    const newPassword = document.getElementById('edit-admin-password').value;
    const email = document.getElementById('edit-admin-email').value;
    
    try {
        await db.collection('users').doc(id).update({
            username: newUsername
        });
        
        if (newPassword) {
            alert(`Username updated!\n\n⚠️ NOTE ON PASSWORD: To securely update another user's password (${email}), you need Firebase Cloud Functions. A frontend web app is not allowed to force-change another user's password for security reasons.`);
        } else {
            alert('Admin details updated successfully!');
        }
        closeEditAdmin();
    } catch (error) {
        console.error("Error updating admin:", error);
        alert('Error updating admin: ' + error.message);
    }
});

window.deleteCurrentAdmin = async function() {
    const id = document.getElementById('edit-admin-id').value;
    const email = document.getElementById('edit-admin-email').value;
    
    if (confirm(`Are you absolutely sure you want to completely delete ${email}?`)) {
        try {
            await db.collection('users').doc(id).delete();
            alert('Admin account deleted from database!\n\n(Note: Full deletion from Firebase Authentication requires Cloud Functions.)');
            closeEditAdmin();
        } catch (error) {
            console.error("Error deleting admin:", error);
            alert('Failed to delete admin: ' + error.message);
        }
    }
}

/* -----------------------------
   System Activity (Global Log)
------------------------------ */
const systemActivityModal = document.getElementById('system-activity-modal');

// Close on backdrop
if (systemActivityModal) {
    systemActivityModal.addEventListener('click', (e) => {
        if (e.target === systemActivityModal) closeSystemActivityModal();
    });
}

async function loadGlobalActivity() {
    const list = document.getElementById('global-activity-list');
    if (!list) return;

    list.innerHTML = '<div class="text-center py-10 text-gray-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري جلب سجل النشاط العام...</div>';

    try {
        // Fetch all logs from system_logs
        const snapshot = await db.collection('system_logs')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<div class="text-center py-10 text-gray-500 font-bold">لا يوجد نشاط مسجل حالياً.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const log = doc.data();
            const dateStr = log.createdAt ? log.createdAt.toDate().toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '...';
            
            let icon = 'fa-circle-info';
            let color = 'text-blue-500';
            
            if (log.type === 'add_patient') { icon = 'fa-user-plus'; color = 'text-green-500'; }
            else if (log.type === 'delete_patient') { icon = 'fa-trash-can'; color = 'text-red-500'; }
            else if (log.type === 'balance_update') { icon = 'fa-money-bill-transfer'; color = 'text-amber-500'; }
            else if (log.type === 'telegram_booking') { icon = 'fa-calendar-check'; color = 'text-sky-500'; }

            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm flex items-start gap-4 animate-fade-in';
            card.innerHTML = `
                <div class="w-10 h-10 rounded-full ${color.replace('text-', 'bg-')}/10 flex items-center justify-center shrink-0">
                    <i class="fa-solid ${icon} ${color} text-base"></i>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <p class="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">${log.userName || 'Unknown Admin'}</p>
                        <p class="text-[10px] text-gray-400 font-bold">${dateStr}</p>
                    </div>
                    <p class="text-sm font-bold text-gray-700 dark:text-gray-200 leading-normal">${log.details}</p>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading global activity:", e);
        list.innerHTML = '<div class="text-center py-10 text-red-500 font-bold">حدث خطأ أثناء جلب السجل. تأكد من إعدادات الفهرسة في Firestore.</div>';
    }
}

/* -----------------------------
   Admin Activity Tracking (Individual)
------------------------------ */
async function loadAdminActivity(adminUid) {
    const logContainer = document.getElementById('admin-activity-log');
    if (!logContainer) return;
    
    logContainer.innerHTML = '<p class="text-[10px] text-gray-500 animate-pulse">جاري تحميل النشاط...</p>';
    
    try {
        // Removed .orderBy() to avoid mandatory composite indexes in Firestore
        const snapshot = await db.collection('system_logs')
            .where('userId', '==', adminUid)
            .limit(50)
            .get();
            
        let logs = [];
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });

        // Sort by date in JS
        logs.sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt) : 0;
            const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt) : 0;
            return dateB - dateA;
        });

        logContainer.innerHTML = '';
        
        if (logs.length === 0) {
            logContainer.innerHTML = '<p class="text-[10px] text-gray-400 italic">لا يوجد نشاط مسجل لهذا الحساب حالياً.</p>';
            return;
        }

        logs.forEach(log => {
            const dateStr = log.createdAt ? (log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt)).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '...';
            
            let icon = 'fa-circle-info';
            let color = 'text-blue-500';
            
            if (log.type === 'add_patient') { icon = 'fa-user-plus'; color = 'text-green-500'; }
            else if (log.type === 'delete_patient') { icon = 'fa-trash-can'; color = 'text-red-500'; }
            else if (log.type === 'balance_update') { icon = 'fa-money-bill-transfer'; color = 'text-amber-500'; }

            const item = document.createElement('div');
            item.className = 'flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800/50';
            item.innerHTML = `
                <div class="w-6 h-6 rounded-full ${color.replace('text-', 'bg-')}/10 flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fa-solid ${icon} ${color} text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight">${log.details}</p>
                    <p class="text-[9px] text-gray-400 mt-0.5">${dateStr}</p>
                </div>
            `;
            logContainer.appendChild(item);
        });
    } catch (e) {
        console.error("Error loading admin activity:", e);
        logContainer.innerHTML = '<p class="text-[10px] text-red-500">حدث خطأ أثناء تحميل السجل.</p>';
    }
}

function openManageAdmins() {
    const manageModal = document.getElementById('manage-admins-modal');
    if (manageModal) {
        manageModal.classList.remove('hidden');
        loadAdmins();
        markAsRead('manage-admins');
    }
}
window.openManageAdmins = openManageAdmins;

function closeManageAdmins() {
    const manageModal = document.getElementById('manage-admins-modal');
    if (manageModal) manageModal.classList.add('hidden');
}
window.closeManageAdmins = closeManageAdmins;

function openTelegramUsersModal() {
    const modal = document.getElementById('telegram-users-modal');
    if (modal) {
        modal.classList.remove('hidden');
        loadTelegramUsers();
        markAsRead('telegram-users');
        // Explicitly hide for instant feedback
        const badge = document.getElementById('badge-telegram-users');
        if (badge) badge.classList.add('hidden');
    }
}
window.openTelegramUsersModal = openTelegramUsersModal;

function closeTelegramUsersModal() {
    const modal = document.getElementById('telegram-users-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeTelegramUsersModal = closeTelegramUsersModal;

function openSystemActivityModal() {
    const modal = document.getElementById('system-activity-modal');
    if (modal) {
        modal.classList.remove('hidden');
        loadGlobalActivity();
        markAsRead('system-activity');
        // Explicitly hide for instant feedback
        const badge = document.getElementById('badge-system-activity');
        if (badge) badge.classList.add('hidden');
    }
}
window.openSystemActivityModal = openSystemActivityModal;

function closeSystemActivityModal() {
    const modal = document.getElementById('system-activity-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeSystemActivityModal = closeSystemActivityModal;

// Optimistic UI state to prevent flickering
let optimisticSeen = {};

async function markAsRead(sectionId) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    // 1. Instant UI update
    optimisticSeen[sectionId] = true;
    const badgeId = sectionId === 'system-activity' ? 'badge-system-activity' : 
                    sectionId === 'telegram-users' ? 'badge-telegram-users' : 
                    sectionId === 'manage-admins' ? 'badge-manage-admins' : `badge-user-${sectionId.replace('user_', '')}`;
    const badge = document.getElementById(badgeId);
    if (badge) badge.classList.add('hidden');

    try {
        // 2. Update Firestore
        // We try update first (more efficient for nested), then set as fallback
        const userRef = db.collection('users').doc(user.uid);
        await userRef.update({
            [`lastSeen.${sectionId}`]: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(async (err) => {
            if (err.code === 'not-found' || err.code === 'invalid-argument') {
                await userRef.set({
                    lastSeen: { [sectionId]: firebase.firestore.FieldValue.serverTimestamp() }
                }, { merge: true });
            } else {
                throw err;
            }
        });
        
        console.log(`Marked ${sectionId} as read successfully`);
    } catch (err) {
        console.error("Error marking as read:", err);
        // If it fails, we keep it in optimisticSeen but alert the user if it's a permission error
        if (err.code === 'permission-denied') {
            alert("⚠️ لا يمكن حفظ حالة الإشعارات: صلاحيات قاعدة البيانات مرفوضة.");
        }
    }
}
window.markAsRead = markAsRead;

/* -----------------------------
   Notification Badges Logic
------------------------------ */
/* -----------------------------
   Notification Badges Logic
------------------------------ */
let currentUserLastSeen = null;

function updateNotificationBadges() {
    const user = firebase.auth().currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Listen to current user's data
    db.collection('users').doc(user.uid).onSnapshot(userDoc => {
        if (userDoc.exists) {
            window.currentUserData = userDoc.data(); // Fix for patients.js modal authentication timeout
            
            // SECURITY REDIRECT: if not main_admin, redirect to index
            if (window.currentUserData.role !== 'main_admin') {
                window.location.href = 'index.html';
                return;
            }

            currentUserLastSeen = userDoc.data().lastSeen || {};
            // Trigger badge updates when seen data changes
            refreshAllBadges();
        } else {
            // New admin with no seen data yet
            currentUserLastSeen = {};
            refreshAllBadges();
        }
    });
}

function refreshAllBadges() {
    const user = firebase.auth().currentUser;
    // CRITICAL: Do not run queries until we have loaded the lastSeen state from Firestore
    if (!user || currentUserLastSeen === null) return;

    // If no TS exists, assume "everything before now - 1 min" has been seen 
    // to avoid showing the entire history as new.
    const defaultTS = firebase.firestore.Timestamp.fromMillis(Date.now() - 60000);
    const getTS = (key) => currentUserLastSeen[key] || defaultTS;

    // 1. System Activity Badge
    const isSystemOptimistic = optimisticSeen['system-activity'];
    db.collection('system_logs').where('createdAt', '>', getTS('system-activity')).get().then(snap => {
        const badge = document.getElementById('badge-system-activity');
        if (badge) {
            const count = isSystemOptimistic ? 0 : snap.size;
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.toggle('hidden', count === 0);
        }
    });

    // 2. Telegram Users Badge (Signups + Transactions + Bookings)
    const lastReadTG = getTS('telegram-users');
    
    Promise.all([
        db.collection('telegram_users').where('createdAt', '>', lastReadTG).get(),
        db_telegram.collection('transactions').where('createdAt', '>', lastReadTG).get(),
        db_telegram.collection('patients').where('bookedAt', '>', lastReadTG).get()
    ]).then(([signups, transactions, bookings]) => {
        const total = signups.size + transactions.size + bookings.size;
        const badge = document.getElementById('badge-telegram-users');
        if (badge) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.classList.toggle('hidden', total === 0);
        }
    });

    // 3. Admin Activity Badges (Manage Admins)
    db.collection('system_logs').where('createdAt', '>', getTS('manage-admins')).get().then(snap => {
        const adminCounts = {};
        let totalNew = 0;
        snap.forEach(doc => {
            const data = doc.data();
            const adminId = data.userId || data.adminId; // Check both userId and adminId
            if (adminId) {
                adminCounts[adminId] = (adminCounts[adminId] || 0) + 1;
                totalNew++;
            }
        });

        // Hide all first
        document.querySelectorAll('[id^="badge-admin-"]').forEach(b => b.classList.add('hidden'));
        
        for (const adminId in adminCounts) {
            const b = document.getElementById(`badge-admin-${adminId}`);
            if (b) {
                b.textContent = adminCounts[adminId];
                b.classList.remove('hidden');
            }
        }
        const mBadge = document.getElementById('badge-manage-admins');
        if (mBadge) {
            mBadge.textContent = totalNew > 99 ? '99+' : totalNew;
            mBadge.classList.toggle('hidden', totalNew === 0);
        }
    });

    // 4. Individual User Badges (Transactions + Patients)
    const db_telegram = firebase.apps.length > 1 ? firebase.app("SecondaryApp").firestore() : db;
    
    // We'll reset all user badges first (to be safe)
    // document.querySelectorAll('[id^="badge-user-"]').forEach(b => b.classList.add('hidden'));

    // Check transactions for ALL users in the last 24h to see who is new
    db_telegram.collection('transactions').where('createdAt', '>', firebase.firestore.Timestamp.fromMillis(Date.now() - 86400000)).get().then(snap => {
        snap.forEach(doc => {
            const data = doc.data();
            const tgId = data.telegramId;
            const lastSeen = getTS(`user_${tgId}`);
            if (data.createdAt > lastSeen) {
                const b = document.getElementById(`badge-user-${tgId}`);
                if (b) {
                    b.textContent = 'جديد';
                    b.classList.remove('hidden');
                }
            }
        });
    });

    // Check patients for ALL users (Filter for last 7 days for performance)
    const weekAgo = firebase.firestore.Timestamp.fromMillis(Date.now() - (7 * 24 * 60 * 60 * 1000));
    db_telegram.collection('patients').where('bookedAt', '>', weekAgo).get().then(snap => {
        snap.forEach(doc => {
            const data = doc.data();
            const tgId = data.bookedBy;
            if (!tgId) return;
            const lastSeen = getTS(`user_${tgId}`);
            if (data.bookedAt > lastSeen) {
                const b = document.getElementById(`badge-user-${tgId}`);
                if (b) {
                    b.textContent = 'جديد';
                    b.classList.remove('hidden');
                }
            }
        });
    });
}

// Re-subscribe to activity changes to trigger refreshes
db.collection('system_logs').onSnapshot(() => refreshAllBadges());
db.collection('telegram_users').onSnapshot(() => refreshAllBadges());
const db_tg = firebase.apps.length > 1 ? firebase.app("SecondaryApp").firestore() : db;
db_tg.collection('transactions').onSnapshot(() => refreshAllBadges());
db_tg.collection('patients').onSnapshot(() => refreshAllBadges());

