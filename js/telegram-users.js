const db_telegram = firebase.firestore();

// --- Audit Bot Notification ---
// Writes to 'audit_logs' collection — the SAME collection used by P2P transfers in the bot.
// The bot (index.js) has a proven working onSnapshot listener on 'audit_logs' that sends via auditBot.
async function sendAuditNotification(data) {
    try {
        await db_telegram.collection('audit_logs').add({
            type: 'admin_action',
            typeLabel: data.typeLabel || 'حركة رصيد',
            targetName: data.targetName || 'غير معروف',
            targetUsername: data.targetUsername || '',
            amount: data.amount || 0,
            newBalance: data.newBalance || 0,
            actorName: data.actorName || 'النظام',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Audit notification written to audit_logs successfully.");
    } catch (err) {
        console.error("❌ Failed to write audit notification:", err);
    }
}



function openTelegramUsersModal() {
    const modal = document.getElementById('telegram-users-modal');
    if (modal) {
        modal.classList.remove('hidden');
        loadTelegramUsers();
    }
}

function closeTelegramUsersModal() {
    const modal = document.getElementById('telegram-users-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Close on backdrop click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('telegram-users-modal');
    if (modal && e.target === modal) {
        closeTelegramUsersModal();
    }
});

function loadTelegramUsers() {
    const tbody = document.getElementById('telegram-users-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>';

    window.allTelegramUsers = [];
    window.currentTelegramFilter = 'all';

    db_telegram.collection('telegram_users').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        window.allTelegramUsers = [];
        snapshot.forEach(doc => {
            window.allTelegramUsers.push({ id: doc.id, ...doc.data() });
        });
        renderTelegramUsers();
    }, (error) => {
        console.error("Error loading telegram users: ", error);
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-red-500">Error loading data</td></tr>`;
    });
}
function filterTelegramUsers(filter) {
    window.currentTelegramFilter = filter;

    // Update UI buttons
    const filters = ['all', 'with-points', 'no-points'];
    const ids = { 'all': 'filter-all', 'with-points': 'filter-points', 'no-points': 'filter-no-points' };

    filters.forEach(f => {
        const btn = document.getElementById(ids[f]);
        if (f === filter) {
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('bg-white', 'dark:bg-zinc-800', 'text-gray-500', 'dark:text-gray-400', 'border');
        } else {
            if (btn) {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-white', 'dark:bg-zinc-800', 'text-gray-500', 'dark:text-gray-400', 'border');
            }
        }
    });

    renderTelegramUsers();
}

function renderTelegramUsers() {
    const tbody = document.getElementById('telegram-users-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = (window.allTelegramUsers || []).filter(user => {
        if (window.currentTelegramFilter === 'with-points') return (user.balance || 0) > 0;
        if (window.currentTelegramFilter === 'no-points') return (user.balance || 0) <= 0;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500">No users found.</td></tr>';
        return;
    }

    filtered.forEach((user) => {
        const id = user.id;
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer';

        const safeName = (user.name || 'N/A').replace(/'/g, "\\'");
        const safeUsername = (user.username || 'N/A').replace(/'/g, "\\'");
        const tgId = user.telegramId || 'N/A';
        const balance = user.balance || 0;

        tr.onclick = () => openEditTelegramModal(id, safeUsername, safeName, tgId, balance);

        tr.innerHTML = `
            <td class="px-4 py-4 text-blue-600 dark:text-blue-400 font-bold">
                <div class="flex items-center justify-between">
                    <span>@${user.username || 'N/A'}</span>
                    <div id="badge-user-${tgId}" class="notification-badge hidden">0</div>
                </div>
            </td>
            <td class="px-4 py-4 font-black text-green-600 dark:text-green-400 text-right">${balance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function logTransaction(telegramId, type, amount, details, relatedId = null) {
    try {
        await db_telegram.collection('transactions').add({
            telegramId,
            type, // 'recharge', 'purchase', 'withdrawal', 'manual'
            amount,
            details,
            relatedId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Error logging transaction:", e);
    }
}

function openEditTelegramModal(id, username, name, tgid, balance) {
    document.getElementById('edit-telegram-id').value = id;
    document.getElementById('edit-telegram-username').textContent = '@' + username;
    document.getElementById('edit-telegram-name').textContent = name;
    document.getElementById('edit-telegram-tgid').textContent = tgid;
    document.getElementById('edit-telegram-balance').value = balance;

    const modal = document.getElementById('edit-telegram-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeEditTelegramModal() {
    const modal = document.getElementById('edit-telegram-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    const editModal = document.getElementById('edit-telegram-modal');
    if (editModal && e.target === editModal) {
        closeEditTelegramModal();
    }
});

// Handle manual balance edit form submission
const editTelegramForm = document.getElementById('edit-telegram-form');
if (editTelegramForm) {
    editTelegramForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-telegram-id').value;
        const newBalance = parseFloat(document.getElementById('edit-telegram-balance').value);

        if (!isNaN(newBalance)) {
            const btn = editTelegramForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            const userRef = db_telegram.collection('telegram_users').doc(id);

            try {
                const userDoc = await userRef.get();
                if (!userDoc.exists) throw "User not found";

                const oldBalance = userDoc.data().balance || 0;
                const diff = newBalance - oldBalance;
                const oldMessageId = userDoc.data().lastMessageId;

                // Update Firestore
                await userRef.update({
                    balance: newBalance,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Log system event for admin activity
                const username = userDoc.data().username || userDoc.data().name || id;
                if (window.logSystemEvent) {
                    await window.logSystemEvent('balance_update', `قام بتعديل رصيد @${username} من ${oldBalance.toLocaleString()} إلى ${newBalance.toLocaleString()}`);
                }

                // Log Transaction
                const mainDb = typeof db !== 'undefined' ? db : firebase.firestore();
                let currentAdminName = 'الأدمن';
                try {
                    const authUser = firebase.auth().currentUser;
                    if (authUser) {
                        const adminDoc = await mainDb.collection('users').doc(authUser.uid).get();
                        if (adminDoc.exists) {
                            currentAdminName = adminDoc.data().username || adminDoc.data().name || 'الأدمن';
                        }
                    }
                } catch (e) { console.warn("Could not get admin name:", e); }

                await logTransaction(id, 'manual', diff, `تعديل يدوي بواسطة (${currentAdminName}): من ${oldBalance.toLocaleString()} إلى ${newBalance.toLocaleString()}`);

                // --- Direct Audit Bot Notification ---
                await sendAuditNotification({
                    typeLabel: 'تعديل يدوي (لوحة التحكم)',
                    targetName: userDoc.data().name || id,
                    targetUsername: userDoc.data().username || '',
                    amount: diff,
                    newBalance: newBalance,
                    actorName: currentAdminName
                });

                // --- Notification Logic ---
                // Write a pending notification to Firestore. The bot (Node.js) will pick it up and send the Telegram message.
                let messageText = "";
                if (diff > 0) {
                    messageText = `💰 تم إضافة مبلغ ${diff.toLocaleString()} د.ع إلى رصيدك.\n\n📈 رصيدك الحالي: ${newBalance.toLocaleString()} د.ع`;
                } else if (diff < 0) {
                    messageText = `📉 تم خصم مبلغ ${Math.abs(diff).toLocaleString()} د.ع من رصيدك.\n\n📊 رصيدك الحالي: ${newBalance.toLocaleString()} د.ع`;
                } else {
                    messageText = `⚖️ تم تحديث بيانات رصيدك.\n\n📊 رصيدك الحالي: ${newBalance.toLocaleString()} د.ع`;
                }

                await db_telegram.collection('pending_notifications').add({
                    telegramId: id,
                    text: messageText,
                    type: 'balance_update',
                    cleanupOldMessage: true,
                    oldMessageId: oldMessageId || null,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                closeEditTelegramModal();
                btn.disabled = false;
                btn.innerHTML = originalText;
                alert("✅ تم تحديث الرصيد وإرسال إشعار للمستخدم.");

            } catch (error) {
                console.error("Error updating balance:", error);
                alert("Error updating balance: " + error);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    });
}

// --- New Functions for Recharge Requests ---

function switchTelegramTab(tab) {
    const usersTab = document.getElementById('tab-users');
    const requestsTab = document.getElementById('tab-requests');
    const activityTab = document.getElementById('tab-activity');
    const logsTab = document.getElementById('tab-logs');
    const usersBtn = document.getElementById('tab-users-btn');
    const requestsBtn = document.getElementById('tab-requests-btn');
    const logsBtn = document.getElementById('tab-logs-btn');

    // Hide all tabs first
    [usersTab, requestsTab, activityTab, logsTab].forEach(t => { if (t) t.classList.add('hidden'); });

    // Reset buttons
    [usersBtn, requestsBtn, logsBtn].forEach(b => {
        if (b) b.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        if (b) b.classList.add('border-transparent', 'text-gray-500');
    });

    if (tab === 'users') {
        usersTab.classList.remove('hidden');
        usersBtn.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        usersBtn.classList.remove('border-transparent', 'text-gray-500');
        loadTelegramUsers();
    } else if (tab === 'requests') {
        requestsTab.classList.remove('hidden');
        requestsBtn.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        requestsBtn.classList.remove('border-transparent', 'text-gray-500');
        loadRechargeRequests();
    } else if (tab === 'activity') {
        if (activityTab) activityTab.classList.remove('hidden');
    } else if (tab === 'logs') {
        if (logsTab) logsTab.classList.remove('hidden');
        if (logsBtn) {
            logsBtn.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
            logsBtn.classList.remove('border-transparent', 'text-gray-500');
        }
        loadSystemLogs();
    }
}

function viewUserActivity() {
    const tgId = document.getElementById('edit-telegram-id').value;
    const username = document.getElementById('edit-telegram-username').textContent;

    if (!tgId) return;

    // Mark as read in Firestore
    if (window.markAsRead) {
        window.markAsRead(`user_${tgId}`);
    }

    const userBadge = document.getElementById(`badge-user-${tgId}`);
    if (userBadge) userBadge.classList.add('hidden');

    closeEditTelegramModal();
    switchTelegramTab('activity');

    document.getElementById('activity-user-title').textContent = `نشاط المستخدم: ${username}`;
    loadUserActivity(tgId);
}

async function loadUserActivity(telegramId) {
    const list = document.getElementById('user-activity-list');
    if (!list) return;

    list.innerHTML = '<div class="text-center py-10 text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري جلب النشاط...</div>';

    try {
        const idStr = String(telegramId);
        // We will fetch from both 'transactions' and 'patients' (bookedBy)
        const transQuery = db_telegram.collection('transactions').where('telegramId', '==', idStr).limit(50).get();
        const patientsQuery = db_telegram.collection('patients').where('bookedBy', '==', idStr).limit(50).get();

        const [transSnap, patientsSnap] = await Promise.all([transQuery, patientsQuery]);

        let activities = [];
        const bookedPatientIds = new Set();

        patientsSnap.forEach(doc => {
            bookedPatientIds.add(doc.id);
            const data = doc.data();
            activities.push({
                actCategory: 'booking',
                id: doc.id,
                ...data,
                date: data.bookedAt ? data.bookedAt.toDate() : new Date(),
                amount: -(data.price || 0)
            });
        });

        transSnap.forEach(doc => {
            const data = doc.data();

            // Skip transactions that are redundant with booking records
            if (data.type === 'purchase' && data.relatedId && bookedPatientIds.has(data.relatedId)) {
                return;
            }

            activities.push({
                actCategory: 'transaction',
                id: doc.id,
                ...data,
                date: data.createdAt ? data.createdAt.toDate() : new Date()
            });
        });

        // Sort all by date
        activities.sort((a, b) => b.date - a.date);

        list.innerHTML = '';
        if (activities.length === 0) {
            list.innerHTML = '<div class="text-center py-10 text-gray-500 font-bold">لا يوجد نشاط مسجل لهذا المستخدم.</div>';
            return;
        }

        activities.forEach(act => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm flex flex-col gap-1';

            const dateStr = act.date.toLocaleString('ar-EG');
            let typeLabel = '';
            let colorClass = '';
            let icon = '';
            let details = act.details || '';

            if (act.actCategory === 'transaction') {
                if (act.type === 'recharge' || (act.amount > 0 && act.type === 'manual')) {
                    typeLabel = 'تعبئة رصيد';
                    colorClass = 'text-green-600';
                    icon = 'fa-plus-circle';
                } else if (act.type === 'manual') {
                    typeLabel = 'تعديل يدوي';
                    colorClass = 'text-blue-600 font-black';
                    icon = 'fa-pen-to-square';
                } else if (act.amount < 0) {
                    typeLabel = 'خصم / سحب';
                    colorClass = 'text-red-600';
                    icon = 'fa-minus-circle';
                } else {
                    typeLabel = 'تعديل بيانات';
                    colorClass = 'text-zinc-600';
                    icon = 'fa-info-circle';
                }
            }
            if (act.actCategory === 'booking') {
                typeLabel = 'حجز مريض';
                colorClass = 'text-purple-600';
                icon = 'fa-hospital-user';

                // Translate governorate if it's an ID
                const govLabels = {
                    'Baghdad': 'بغداد', 'Basra': 'البصرة', 'Nineveh': 'نينوى', 'Erbil': 'أربيل',
                    'Najaf': 'النجف', 'Karbala': 'كربلاء', 'Babil': 'بابل', 'Dhi Qar': 'ذي قار',
                    'Al Anbar': 'الأنبار', 'Maysan': 'ميسان', 'Diyala': 'ديالى', 'Al-Qādisiyyah': 'القادسية',
                    'Wasit': 'واسط', 'Sulaymaniyah': 'السليمانية', 'Duhok': 'دهوك', 'Kirkuk': 'كركوك',
                    'Muthanna': 'المثنى', 'Halabja': 'حلبجة'
                };
                const translatedGov = govLabels[act.governorate] || act.governorate || 'غير محدد';
                details = `حجز المريض: ${act.patientName || 'بدون اسم'} (${translatedGov})`;
            }

            if (act.actCategory === 'transaction' && act.details && act.details.includes('بواسطة')) {
                // Special layout for manual adjustments with admin name
                const adminMatch = act.details.match(/\((.*?)\)/);
                const adminName = adminMatch ? adminMatch[1] : 'الأدمن';
                const actionDetails = act.details.replace(`بواسطة (${adminName}):`, '').trim();

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <i class="fa-solid fa-pen-to-square text-blue-600 dark:text-blue-400 text-[10px]"></i>
                            </div>
                            <span class="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">${adminName}</span>
                        </div>
                        <span class="text-[10px] text-gray-400 font-bold">${dateStr}</span>
                    </div>
                    <p class="text-xs font-bold text-gray-700 dark:text-gray-200 leading-normal pl-8">${actionDetails}</p>
                `;
            } else {
                // Default layout for other activities
                const amountStr = act.amount ? `${act.amount > 0 ? '+' : ''}${act.amount.toLocaleString()} د.ع` : '';

                card.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid ${icon} ${colorClass}"></i>
                            <span class="font-bold text-sm">${typeLabel}</span>
                        </div>
                        <span class="text-xs font-black ${colorClass}">${amountStr}</span>
                    </div>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${details}</p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-[10px] text-gray-400">${dateStr}</span>
                        ${act.type === 'booking' ? `<button onclick="editPatient('${act.id}')" class="text-[10px] font-bold text-blue-600 hover:underline">عرض المريض</button>` : ''}
                    </div>
                `;
            }
            list.appendChild(card);
        });

    } catch (e) {
        console.error("Error loading activity:", e);
        list.innerHTML = '<div class="text-center py-10 text-red-500">حدث خطأ أثناء جلب النشاط</div>';
    }
}

// Live listener for the requests badge (Notification)
db_telegram.collection('recharge_requests').where('status', '==', 'pending').onSnapshot((snapshot) => {
    const badge = document.getElementById('requests-badge');
    if (badge) {
        const count = snapshot.size;
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
});

// Live listener for the system logs badge
db_telegram.collection('system_logs').orderBy('createdAt', 'desc').limit(1).onSnapshot((snapshot) => {
    const badge = document.getElementById('logs-badge');
    if (badge && !snapshot.empty) {
        // For simplicity, we just show a dot or 1 if there are any logs in the last few hours
        // Or just always show a dot if there's a new log the user hasn't seen
        badge.classList.remove('hidden');
        badge.textContent = '!';
    }
});

function loadSystemLogs() {
    const list = document.getElementById('system-logs-list');
    if (!list) return;

    // Clear badge when viewing
    const badge = document.getElementById('logs-badge');
    if (badge) badge.classList.add('hidden');

    list.innerHTML = '<div class="text-center py-10 text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري جلب الإشعارات...</div>';

    db_telegram.collection('system_logs').orderBy('createdAt', 'desc').limit(50).onSnapshot((snapshot) => {
        list.innerHTML = '';

        if (snapshot.empty) {
            list.innerHTML = '<div class="text-center py-10 text-gray-500 font-bold">لا توجد إشعارات حالياً.</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const log = doc.data();
            const id = doc.id;

            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm flex items-start gap-3 animate-fade-in';

            const dateStr = log.createdAt ? log.createdAt.toDate().toLocaleString('ar-EG') : 'قيد المعالجة';

            let icon = 'fa-info-circle';
            let colorClass = 'text-blue-500';

            if (log.type === 'add_patient') {
                icon = 'fa-user-plus';
                colorClass = 'text-green-500';
            } else if (log.type === 'delete_patient') {
                icon = 'fa-user-minus';
                colorClass = 'text-red-500';
            }

            card.innerHTML = `
                <div class="w-10 h-10 rounded-full ${colorClass.replace('text-', 'bg-')}/10 flex items-center justify-center shrink-0">
                    <i class="fa-solid ${icon} ${colorClass}"></i>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <p class="text-xs font-black text-gray-400 uppercase tracking-widest">${log.userName || 'Unknown'}</p>
                        <p class="text-[10px] text-gray-400">${dateStr}</p>
                    </div>
                    <p class="text-sm font-bold text-gray-700 dark:text-gray-200">${log.details}</p>
                </div>
            `;
            list.appendChild(card);
        });
    }, (error) => {
        console.error("Error loading logs:", error);
        list.innerHTML = '<div class="text-center py-10 text-red-500">حدث خطأ أثناء جلب الإشعارات</div>';
    });
}

function loadRechargeRequests() {
    const list = document.getElementById('recharge-requests-list');
    if (!list) return;

    list.innerHTML = '<div class="text-center py-10 text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري جلب الطلبات...</div>';

    db_telegram.collection('recharge_requests').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        list.innerHTML = '';

        if (snapshot.empty) {
            list.innerHTML = '<div class="text-center py-10 text-gray-500 font-bold">لا توجد طلبات تعبئة حالياً.</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const req = doc.data();
            const id = doc.id;

            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm flex flex-col gap-4 animate-fade-in';

            const dateStr = req.createdAt ? new Date(req.createdAt.toDate()).toLocaleString('ar-EG') : 'قيد المعالجة';

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-blue-600 dark:text-blue-400">@${req.username || 'N/A'}</p>
                        <p class="text-xs text-gray-500">${req.name || 'N/A'}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-black text-green-600 dark:text-green-400">${(req.amount || 0).toLocaleString()} د.ع</p>
                        <p class="text-[10px] text-gray-400">${dateStr}</p>
                    </div>
                </div>
                
                <div class="relative group aspect-video overflow-hidden rounded-lg border dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
                    <img src="${req.receiptUrl}" class="w-full h-full object-contain cursor-zoom-in" onclick="window.open('${req.receiptUrl}', '_blank')">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                        <span class="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">إضغط لتكبير الصورة</span>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button onclick="approveRequest(event, '${id}', '${req.telegramId}', ${req.amount})" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg shadow-green-500/20">
                        <i class="fa-solid fa-check mr-1"></i> قبول التعبئة
                    </button>
                    <button onclick="rejectRequest(event, '${id}')" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg shadow-red-500/20">
                        <i class="fa-solid fa-trash-can mr-1"></i> رفض
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    }, (error) => {
        console.error("Error loading requests:", error);
        list.innerHTML = '<div class="text-center py-10 text-red-500">حدث خطأ أثناء جلب الطلبات</div>';
    });
}

function approveRequest(event, requestId, telegramId, amount) {
    if (!confirm(`هل أنت متأكد من قبول الطلب وإضافة مبلغ ${amount.toLocaleString()} د.ع إلى رصيد المستخدم؟`)) return;

    const btn = event.currentTarget;
    const card = btn.closest('.bg-white');
    const allButtons = card.querySelectorAll('button');
    
    // Disable UI to prevent multiple clicks
    allButtons.forEach(b => b.disabled = true);
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري القبول...';

    const userRef = db_telegram.collection('telegram_users').doc(telegramId);
    const requestRef = db_telegram.collection('recharge_requests').doc(requestId);
    let newBalance = 0;

    // Resolve admin name BEFORE the transaction so it's accessible everywhere
    const mainDb = typeof db !== 'undefined' ? db : firebase.firestore();
    let currentAdminName = 'الأدمن';

    const resolveAndRun = async () => {
        try {
            const authUser = firebase.auth().currentUser;
            if (authUser) {
                const adminDoc = await mainDb.collection('users').doc(authUser.uid).get();
                if (adminDoc.exists) {
                    currentAdminName = adminDoc.data().username || adminDoc.data().name || 'الأدمن';
                }
            }
        } catch (e) { console.warn("Could not get admin name:", e); }

        // Use transaction to ensure balance is updated correctly and request is only processed once
        await db_telegram.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const requestDoc = await transaction.get(requestRef);

            if (!requestDoc.exists) throw "هذا الطلب تمت معالجته بالفعل أو غير موجود! ❌";
            if (!userDoc.exists) throw "المستخدم غير موجود في النظام! ❌";

            const currentBalance = userDoc.data().balance || 0;
            newBalance = currentBalance + amount;

            transaction.update(userRef, {
                balance: newBalance,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const transRef = db_telegram.collection('transactions').doc();
            transaction.set(transRef, {
                telegramId: telegramId,
                type: 'recharge',
                amount: amount,
                details: `تعبئة رصيد بواسطة (${currentAdminName}) عبر طلب (زين كاش/ماستر كارد)`,
                relatedId: requestId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Delete the request after approval
            transaction.delete(requestRef);
        });

        // Fetch user data for logging and cleanup
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};

        // Log system event for admin activity
        if (window.logSystemEvent) {
            window.logSystemEvent('balance_update', `قام (${currentAdminName}) بقبول طلب شحن لـ @${userData.username || telegramId} بمبلغ ${amount.toLocaleString()}`);
        }

        // --- Direct Audit Bot Notification ---
        await sendAuditNotification({
            typeLabel: 'قبول طلب تعبئة',
            targetName: userData.name || telegramId,
            targetUsername: userData.username || '',
            amount: amount,
            newBalance: newBalance,
            actorName: currentAdminName
        });

        const oldMessageId = userData.lastMessageId;

        // Write a pending notification to Firestore. The bot (Node.js) will pick it up and send the Telegram message.
        const messageText = `✅ تم قبول طلب التعبئة بنجاح!\n\n💰 المبلغ المضاف: ${amount.toLocaleString()} د.ع\n📈 رصيدك الحالي: ${newBalance.toLocaleString()} د.ع\n\nيمكنك الآن العودة للقائمة الرئيسية لاستخدام رصيدك.`;

        try {
            await db_telegram.collection('pending_notifications').add({
                telegramId: telegramId,
                text: messageText,
                type: 'recharge_approved',
                cleanupOldMessage: true,
                oldMessageId: oldMessageId || null,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error("Failed to queue telegram notification:", err);
        }

        alert('✅ تم قبول الطلب وتحديث الرصيد بنجاح.');
    };

    resolveAndRun().catch((error) => {
        console.error("Error approving request: ", error);
        alert(error);
        // Re-enable if failed
        allButtons.forEach(b => b.disabled = false);
        btn.innerHTML = originalContent;
    });
}

function rejectRequest(event, requestId) {
    if (!confirm('هل أنت متأكد من رفض وحذف هذا الطلب؟')) return;

    const btn = event.currentTarget;
    const card = btn.closest('.bg-white');
    const allButtons = card.querySelectorAll('button');
    
    allButtons.forEach(b => b.disabled = true);
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> جاري الرفض...';

    db_telegram.collection('recharge_requests').doc(requestId).delete()
        .then(() => alert('🗑️ تم رفض وحذف الطلب بنجاح.'))
        .catch(err => {
            console.error("Error rejecting request:", err);
            alert('❌ خطأ في حذف الطلب: ' + err);
            allButtons.forEach(b => b.disabled = false);
            btn.innerHTML = originalContent;
        });
}

async function openWithdrawModal() {
    const id = document.getElementById('edit-telegram-id').value;
    const currentBalance = parseFloat(document.getElementById('edit-telegram-balance').value) || 0;

    const amountStr = prompt(`ادخل المبلغ المراد سحبه (الرصيد الحالي: ${currentBalance.toLocaleString()}):`);
    if (amountStr === null) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert("يرجى ادخال مبلغ صحيح");
        return;
    }

    if (amount > currentBalance) {
        alert("المبلغ المدخل اكبر من الرصيد الحالي!");
        return;
    }

    if (!confirm(`هل انت متأكد من سحب مبلغ ${amount.toLocaleString()} د.ع من رصيد المستخدم؟`)) return;

    try {
        const userRef = db_telegram.collection('telegram_users').doc(id);
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const newBalance = currentBalance - amount;
        const oldMessageId = userData.lastMessageId;

        await userRef.update({
            balance: newBalance,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Get admin name
        const mainDb = typeof db !== 'undefined' ? db : firebase.firestore();
        let currentAdminName = 'الأدمن';
        try {
            const authUser = firebase.auth().currentUser;
            if (authUser) {
                const adminDoc = await mainDb.collection('users').doc(authUser.uid).get();
                if (adminDoc.exists) {
                    currentAdminName = adminDoc.data().username || adminDoc.data().name || 'الأدمن';
                }
            }
        } catch (e) { console.warn("Could not get admin name:", e); }

        await logTransaction(id, 'withdrawal', -amount, `سحب مبلغ يدوي بواسطة (${currentAdminName})`);

        // Log system event
        const username = userData.username || userData.name || id;
        if (window.logSystemEvent) {
            await window.logSystemEvent('balance_update', `قام بسحب مبلغ ${amount.toLocaleString()} من رصيد @${username}`);
        }

        // --- Audit Bot Notification ---
        await sendAuditNotification({
            typeLabel: 'سحب يدوي (لوحة التحكم)',
            targetName: userData.name || id,
            targetUsername: userData.username || '',
            amount: -amount,
            newBalance: newBalance,
            actorName: currentAdminName
        });

        // --- Notify the Telegram user ---
        const messageText = `📉 تم خصم مبلغ ${amount.toLocaleString()} د.ع من رصيدك.\n\n📊 رصيدك الحالي: ${newBalance.toLocaleString()} د.ع`;
        await db_telegram.collection('pending_notifications').add({
            telegramId: id,
            text: messageText,
            type: 'balance_withdrawal',
            cleanupOldMessage: true,
            oldMessageId: oldMessageId || null,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('edit-telegram-balance').value = newBalance;
        alert("✅ تم سحب المبلغ وإرسال إشعار للمستخدم بنجاح.");

    } catch (e) {
        console.error("Error withdrawing amount:", e);
        alert("حدث خطأ أثناء سحب المبلغ");
    }
}
