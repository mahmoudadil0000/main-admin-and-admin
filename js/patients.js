// Patient Modal Wizard Logic
let currentStep = 1;
const totalSteps = 4;

const patientModal = document.getElementById('add-patient-modal');
const patientForm = document.getElementById('add-patient-form');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');
const btnSubmit = document.getElementById('btn-submit');
const progressBar = document.getElementById('step-progress-bar');

window.openAddPatientModal = function() {
    patientModal.classList.remove('hidden');
    currentStep = 1;
    patientForm.reset();
    updateWizardUI();
}

window.closeAddPatientModal = function() {
    patientModal.classList.add('hidden');
}

// Close on backdrop click
patientModal.addEventListener('click', (e) => {
    if (e.target === patientModal) {
        closeAddPatientModal();
    }
});

btnNext.addEventListener('click', () => {
    if (validateStep(currentStep)) {
        currentStep++;
        updateWizardUI();
    }
});

btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
    }
});

function validateStep(step) {
    if (step === 1) {
        const gov = document.getElementById('patient-gov').value;
        const city = document.getElementById('patient-city').value.trim();
        if (!gov) { alert('Please select a Governorate first.'); return false; }
        if (!city) { alert('Please enter a City/Region.'); return false; }
    } else if (step === 2) {
        const cases = document.querySelectorAll('input[name="patient-case"]:checked');
        if (cases.length === 0) { alert('Please select at least one Case.'); return false; }
    } else if (step === 3) {
        const daysEl = document.querySelector('input[name="patient-days"]:checked');
        if (!daysEl) { alert('Please select Clinic Days.'); return false; }
    }
    return true;
}

function updateWizardUI() {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    
    // Show current step
    document.getElementById(`step-${currentStep}`).classList.remove('hidden');
    
    // Update progress bar
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update step indicators
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById(`indicator-${i}`);
        if (i <= currentStep) {
            indicator.classList.remove('bg-gray-200', 'dark:bg-zinc-700', 'text-gray-500');
            indicator.classList.add('bg-blue-600', 'text-white');
        } else {
            indicator.classList.add('bg-gray-200', 'dark:bg-zinc-700', 'text-gray-500');
            indicator.classList.remove('bg-blue-600', 'text-white');
        }
    }
    
    // Update buttons
    btnPrev.classList.toggle('hidden', currentStep === 1);
    
    if (currentStep === totalSteps) {
        btnNext.classList.add('hidden');
        btnSubmit.classList.remove('hidden');
        
        // Populate preview
        document.getElementById('preview-gov').textContent = document.getElementById('patient-gov').value;
        const selectedCases = Array.from(document.querySelectorAll('input[name="patient-case"]:checked')).map(el => el.value).join(', ');
        document.getElementById('preview-case').textContent = selectedCases;
        document.getElementById('preview-days').textContent = document.querySelector('input[name="patient-days"]:checked').value;
    } else {
        btnNext.classList.remove('hidden');
        btnSubmit.classList.add('hidden');
    }
}

// Handle Form Submission
patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        const db = firebase.firestore();
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) throw new Error("Not logged in");

        let imageUrls = [];
        const imageFiles = document.getElementById('patient-image').files;
        
        if (imageFiles.length > 0) {
            btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${imageFiles.length} Image(s)...`;
            
            for (let i = 0; i < imageFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', imageFiles[i]);
                formData.append('upload_preset', 'patient');
                formData.append('folder', 'patients');
                
                const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/dpda74vzy/image/upload', {
                    method: 'POST',
                    body: formData
                });
                const cloudinaryData = await cloudinaryRes.json();
                if (cloudinaryData.secure_url) {
                    imageUrls.push(cloudinaryData.secure_url);
                }
            }
        }
        
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Data...';

        const newPatient = {
            governorate: document.getElementById('patient-gov').value,
            city: document.getElementById('patient-city').value.trim(),
            caseTypes: Array.from(document.querySelectorAll('input[name="patient-case"]:checked')).map(el => el.value),
            numberOfPersons: parseInt(document.getElementById('patient-persons').value) || 1,
            clinicDays: Array.from(document.querySelectorAll('input[name="patient-days"]:checked')).map(el => el.value).join(', '),
            patientName: document.getElementById('patient-name').value.trim(),
            phoneNumbers: Array.from(document.querySelectorAll('.patient-phone')).map(el => el.value.trim()).filter(val => val !== ''),
            notes: document.getElementById('patient-notes').value.trim(),
            price: parseFloat(document.getElementById('patient-price').value) || 0,
            imageUrls: imageUrls,
            status: 'Available',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Note: Make sure Firestore Rules allow writes to the 'patients' collection!
        await db.collection('patients').add(newPatient);
        
        // Log event
        if (window.logSystemEvent) {
            await window.logSystemEvent('add_patient', `قام بإضافة مريض جديد: ${newPatient.patientName || 'بدون اسم'} (${newPatient.governorate})`);
        }
        
        alert('Patient details saved successfully!');
        closeAddPatientModal();
    } catch (error) {
        console.error("Error saving patient:", error);
        alert("Error saving patient: " + error.message + "\n\nMake sure your Firestore Rules allow writes to 'patients' collection!");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Save Patient';
    }
});

window.addPhoneInput = function() {
    const container = document.getElementById('phone-numbers-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 mt-2';
    div.innerHTML = `
        <input type="tel" class="patient-phone flex-1 px-4 py-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Additional Phone Number">
        <button type="button" onclick="this.parentElement.remove()" class="px-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"><i class="fa-solid fa-minus"></i></button>
    `;
    container.appendChild(div);
}

// Patient Info Modal Logic
const patientInfoModal = document.getElementById('patient-info-modal');
const patientsListContainer = document.getElementById('patients-list-container');

window.openPatientInfoModal = function() {
    if(patientInfoModal) {
        patientInfoModal.classList.remove('hidden');
        loadPatientsList();
    }
}

window.closePatientInfoModal = function() {
    if(patientInfoModal) patientInfoModal.classList.add('hidden');
}

// Close on backdrop click
if(patientInfoModal) {
    patientInfoModal.addEventListener('click', (e) => {
        if (e.target === patientInfoModal) {
            closePatientInfoModal();
        }
    });
}

let allPatientsData = [];
// Helper to resolve UID to Name
const usersCache = {};
async function getUserName(uid) {
    if (usersCache[uid]) return usersCache[uid];
    try {
        const doc = await firebase.firestore().collection('users').doc(uid).get();
        if (doc.exists) {
            const name = doc.data().username || doc.data().name || 'System';
            usersCache[uid] = name;
            return name;
        }
    } catch (e) {
        console.error("Error fetching user name:", e);
    }
    return 'Unknown';
}

const tgUsersCache = {};
async function getTelegramUserName(tgId) {
    if (!tgId) return 'N/A';
    const idStr = String(tgId);
    if (tgUsersCache[idStr]) return tgUsersCache[idStr];
    try {
        const doc = await firebase.firestore().collection('telegram_users').doc(idStr).get();
        if (doc.exists) {
            const name = doc.data().username ? `@${doc.data().username}` : (doc.data().name || idStr);
            tgUsersCache[idStr] = name;
            return name;
        }
    } catch (e) {
        console.error("Error fetching TG user name:", e);
    }
    return 'N/A';
}

function loadPatientsList() {
    if(!patientsListContainer) return;
    const db = firebase.firestore();
    patientsListContainer.innerHTML = '<p class="text-gray-500 col-span-2 text-center py-8"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>';
    
    db.collection('patients').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        allPatientsData = [];
        snapshot.forEach(doc => {
            allPatientsData.push({ id: doc.id, ...doc.data() });
        });
        filterPatients(); // Initial render
    });
}

window.filterPatients = function() {
    if(!patientsListContainer) return;
    
    const searchInput = document.getElementById('patient-search-input');
    const statusFilter = document.getElementById('patient-status-filter');
    const timeFilter = document.getElementById('patient-time-filter');

    // Advanced Filters
    const advGov = document.getElementById('adv-gov')?.value || 'All';
    const advCity = document.getElementById('adv-city')?.value.toLowerCase() || '';
    const advStatus = document.getElementById('adv-status')?.value || 'All';
    const advCases = Array.from(document.querySelectorAll('input[name="adv-case"]:checked')).map(cb => cb.value);
    const advDays = Array.from(document.querySelectorAll('input[name="adv-day"]:checked')).map(cb => cb.value);
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusVal = statusFilter ? statusFilter.value : 'All';
    const timeVal = timeFilter ? timeFilter.value : 'All';
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;

    const filtered = allPatientsData.filter(p => {
        // Basic Filters
        const matchesSearch = !searchTerm || 
            (p.patientName || '').toLowerCase().includes(searchTerm) ||
            (p.city || '').toLowerCase().includes(searchTerm) ||
            (p.governorate || '').toLowerCase().includes(searchTerm) ||
            (p.caseTypes || []).join(' ').toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusVal === 'All' || p.status === statusVal;

        // Advanced Filters Logic
        const matchesAdvGov = advGov === 'All' || p.governorate === advGov;
        const matchesAdvCity = !advCity || (p.city || '').toLowerCase().includes(advCity);
        const matchesAdvStatus = advStatus === 'All' || p.status === advStatus;
        
        const matchesAdvCases = advCases.length === 0 || advCases.some(c => (p.caseTypes || []).includes(c));
        const matchesAdvDays = advDays.length === 0 || advDays.some(d => (p.clinicDays || '').includes(d));

        // Combined Filter Logic (Quick + Advanced)
        const isBasicallyMatched = matchesSearch && matchesStatus;
        const isAdvancedMatched = matchesAdvGov && matchesAdvCity && matchesAdvStatus && matchesAdvCases && matchesAdvDays;

        if (!isBasicallyMatched || !isAdvancedMatched) return false;

        if (timeVal === 'All') return true;
        const createdAt = p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate().getTime() : p.createdAt) : 0;
        if (timeVal === '1d') return (now - createdAt) <= oneDay;
        if (timeVal === '1w') return (now - createdAt) <= oneWeek;
        if (timeVal === '1m') return (now - createdAt) <= oneMonth;
        if (timeVal === '1y') return (now - createdAt) <= oneYear;
        return true;
    });
    
    updateCounters(filtered);
    renderPatientsList(filtered);
    updateFilterIconState();
}

window.updateFilterIconState = function() {
    const advGov = document.getElementById('adv-gov')?.value || 'All';
    const advCity = document.getElementById('adv-city')?.value || '';
    const advStatus = document.getElementById('adv-status')?.value || 'All';
    const advCases = Array.from(document.querySelectorAll('input[name="adv-case"]:checked'));
    const advDays = Array.from(document.querySelectorAll('input[name="adv-day"]:checked'));
    const quickStatus = document.getElementById('patient-status-filter')?.value || 'All';
    const quickTime = document.getElementById('patient-time-filter')?.value || 'All';
    const searchVal = document.getElementById('patient-search-input')?.value || '';

    const isFiltered = advGov !== 'All' || advCity !== '' || advStatus !== 'All' || 
                       advCases.length > 0 || advDays.length > 0 || 
                       quickStatus !== 'All' || quickTime !== 'All' || searchVal !== '';

    const filterBtn = document.querySelector('button[onclick="openAdvancedFilter()"]');
    const filterIcon = filterBtn?.querySelector('i');
    if (filterIcon) {
        if (isFiltered) {
            filterIcon.classList.remove('text-zinc-400');
            filterIcon.classList.add('text-blue-500');
            filterBtn.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-200', 'dark:border-blue-800');
        } else {
            filterIcon.classList.add('text-zinc-400');
            filterIcon.classList.remove('text-blue-500');
            filterBtn.classList.remove('bg-blue-50', 'dark:bg-blue-900/20', 'border-blue-200', 'dark:border-blue-800');
        }
    }
}

window.resetAdvancedFilter = function() {
    if (document.getElementById('adv-gov')) document.getElementById('adv-gov').value = 'All';
    if (document.getElementById('adv-city')) document.getElementById('adv-city').value = '';
    document.querySelectorAll('input[name="adv-day"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="adv-case"]').forEach(cb => cb.checked = false);
    if (document.getElementById('adv-status')) document.getElementById('adv-status').value = 'All';
    
    // Quick filters
    if (document.getElementById('patient-status-filter')) document.getElementById('patient-status-filter').value = 'All';
    if (document.getElementById('patient-time-filter')) document.getElementById('patient-time-filter').value = 'All';
    if (document.getElementById('patient-search-input')) {
        document.getElementById('patient-search-input').value = '';
        if (window.collapseSearch) window.collapseSearch();
    }

    filterPatients();
}

function updateCounters(patients) {
    const available = patients.filter(p => p.status === 'Available').length;
    const pending = patients.filter(p => p.status === 'Pending').length;
    const used = patients.filter(p => p.status === 'Used').length;
    
    const countAvailable = document.getElementById('count-available');
    const countPending = document.getElementById('count-pending');
    const countUsed = document.getElementById('count-used');
    
    if (countAvailable) countAvailable.textContent = available;
    if (countPending) countPending.textContent = pending;
    if (countUsed) countUsed.textContent = used;
}

function renderPatientsList(patients) {
    patientsListContainer.innerHTML = '';
    
    if (patients.length === 0) {
        const noResultsKey = currentLang === 'ar' ? 'لا يوجد مرضى مطابقين للبحث.' : 'No patients found matching your search.';
        patientsListContainer.innerHTML = `<p class="text-gray-500 text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-700 font-medium">${noResultsKey}</p>`;
        return;
    }
    
    patients.forEach(async p => {
        const patientStatus = p.status || 'Available';
        const createdByName = await getUserName(p.createdBy);
        const statusConfig = {
            'Available': { 
                bg: 'bg-emerald-50 dark:bg-emerald-900/30', 
                text: 'text-emerald-700 dark:text-emerald-400',
                label: translations[currentLang]['available'] || 'Available'
            },
            'Pending': { 
                bg: 'bg-amber-50 dark:bg-amber-900/30', 
                text: 'text-amber-700 dark:text-amber-400',
                label: translations[currentLang]['pending'] || 'Pending'
            },
            'Used': { 
                bg: 'bg-zinc-100 dark:bg-zinc-800', 
                text: 'text-zinc-600 dark:text-zinc-400',
                label: translations[currentLang]['used'] || 'Used'
            }
        };

        const config = statusConfig[patientStatus] || statusConfig['Available'];
        
        // Translate Cases
        const translatedCases = (p.caseTypes || []).map(c => translations[currentLang][c] || c).join(' • ');
        // Translate Days
        const translatedDays = (p.clinicDays || '').split(', ').map(d => translations[currentLang][d] || d).join(', ');

        const images = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
        const mainImage = images.length > 0 ? images[0] : null;
        
        const imageHtml = mainImage ? `
            <div class="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-shrink-0 border border-zinc-100 dark:border-zinc-700">
                <img src="${mainImage}" alt="Patient" class="w-full h-full object-cover" onclick="event.stopPropagation(); window.open('${mainImage}', '_blank')">
            </div>
        ` : `
            <div class="w-14 h-14 rounded-xl bg-gray-50 dark:bg-zinc-900/50 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-zinc-700">
                <i class="fa-solid fa-user text-zinc-300 dark:text-zinc-700 text-base"></i>
            </div>
        `;

        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all animate-fade-in-up cursor-pointer mb-2';
        card.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('img')) editPatient(p.id);
        };

        card.innerHTML = `
            <div class="flex items-center gap-4">
                <!-- Image -->
                ${imageHtml}

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${config.bg} ${config.text}">
                            ${config.label}
                        </span>
                        <h3 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate">
                            ${translatedCases}
                        </h3>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <h2 class="text-sm font-bold truncate">
                            ${p.patientName || (currentLang === 'ar' ? 'مريض بدون اسم' : 'Unnamed Patient')}
                        </h2>
                    </div>

                    <div class="mt-1.5 flex items-center gap-3 flex-wrap">
                        <span class="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                            <i class="fa-solid fa-location-dot text-[8px]"></i>
                            ${p.governorate}, ${p.city}
                        </span>
                        <span class="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                            <i class="fa-solid fa-calendar text-[8px]"></i>
                            ${translatedDays}
                        </span>
                        <span class="text-[10px] font-bold text-blue-500/60 flex items-center gap-1">
                            <i class="fa-solid fa-user-pen text-[8px]"></i>
                            بواسطة: ${createdByName}
                        </span>
                        ${(p.status === 'Used' && !p.hideBookingOnCard) ? `
                            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <i class="fa-solid fa-check-double text-[8px]"></i>
                                حجز بواسطة: ${await getTelegramUserName(p.bookedBy)}
                            </span>
                        ` : ''}
                        ${p.lastModifiedBy ? `
                            <span class="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                <i class="fa-solid fa-user-gear text-[8px]"></i>
                                أخر تعديل: ${p.lastModifiedBy}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <!-- Actions (Only for admin views) -->
                ${window.location.pathname.includes('customer') ? '' : `
                    <div class="flex items-center gap-1.5">
                        <button onclick="event.stopPropagation(); editPatient('${p.id}')" class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-zinc-900 text-zinc-400 hover:text-blue-500 transition-colors flex items-center justify-center">
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                    </div>
                `}
            </div>
        `;
        patientsListContainer.appendChild(card);
    });
}

window.updatePatientStatus = async function(patientId, newStatus) {
    try {
        await firebase.firestore().collection('patients').doc(patientId).update({
            status: newStatus
        });
    } catch (err) {
        console.error("Error updating status:", err);
        alert("Error updating status: " + err.message);
    }
}

// -----------------------------------------------------
// Edit Patient Full Flow
// -----------------------------------------------------
function ensureEditModalExists() {
    if (document.getElementById('edit-patient-modal')) return;

    const modalHTML = `
    <div id="edit-patient-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] hidden flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div class="px-6 py-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center shrink-0">
                <h2 class="text-xl font-bold">Edit Patient</h2>
                <button onclick="closeEditPatientModal()" class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            <div class="p-6 overflow-y-auto bg-gray-50 dark:bg-zinc-900/50 flex-1">
                <form id="edit-patient-form" class="space-y-4 text-sm">
                    <input type="hidden" id="edit-patient-id">
                    
                    <div>
                        <label class="block font-bold mb-1">Status</label>
                        <select id="edit-patient-status" class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Available">Available (متوفرة)</option>
                            <option value="Pending">Pending (معلقة)</option>
                            <option value="Used">Used (تم الاستخدام)</option>
                        </select>
                    </div>

                    <div id="edit-history-section" class="hidden border-t border-gray-100 dark:border-zinc-700 pt-4 mt-4">
                        <button type="button" onclick="togglePatientHistory()" class="flex items-center justify-between w-full text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors">
                            <span><i class="fa-solid fa-clock-rotate-left mr-1"></i> سجل التغييرات</span>
                            <i class="fa-solid fa-chevron-down transition-transform" id="history-chevron"></i>
                        </button>
                        <div id="edit-history-list" class="hidden mt-3 space-y-2"></div>
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Patient Name</label>
                        <input type="text" id="edit-patient-name" class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Patient Photos</label>
                        <div id="edit-images-list" class="grid grid-cols-3 gap-2 mb-3"></div>
                        <input type="file" id="edit-patient-image" accept="image/*" multiple class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                        <p class="text-[10px] text-gray-400 mt-1">Selecting new files will add them to the existing photos.</p>
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Governorate</label>
                        <select id="edit-patient-gov" required class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Baghdad">Baghdad (بغداد)</option>
                            <option value="Basra">Basra (البصرة)</option>
                            <option value="Nineveh">Nineveh (نينوى)</option>
                            <option value="Erbil">Erbil (أربيل)</option>
                            <option value="Najaf">Najaf (النجف)</option>
                            <option value="Karbala">Karbala (كربلاء)</option>
                            <option value="Babil">Babil (بابل)</option>
                            <option value="Dhi Qar">Dhi Qar (ذي قار)</option>
                            <option value="Al Anbar">Al Anbar (الأنبار)</option>
                            <option value="Maysan">Maysan (ميسان)</option>
                            <option value="Diyala">Diyala (ديالى)</option>
                            <option value="Al-Qādisiyyah">Al-Qādisiyyah (القادسية)</option>
                            <option value="Wasit">Wasit (واسط)</option>
                            <option value="Sulaymaniyah">Sulaymaniyah (السليمانية)</option>
                            <option value="Duhok">Duhok (دهوك)</option>
                            <option value="Kirkuk">Kirkuk (كركوك)</option>
                            <option value="Muthanna">Muthanna (المثنى)</option>
                            <option value="Halabja">Halabja (حلبجة)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold mb-1">City / Region (المدينة/المنطقة)</label>
                        <input type="text" id="edit-patient-city" required class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Cases</label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2" id="edit-cases-container">
                            <!-- Populated via JS -->
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Number of Persons (عدد الأشخاص)</label>
                        <input type="number" id="edit-patient-persons" min="1" required class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Clinic Days</label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2" id="edit-days-container">
                            <!-- Populated via JS -->
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Phone Numbers</label>
                        <div id="edit-phones-container" class="space-y-2"></div>
                        <button type="button" onclick="addEditPhoneInput()" class="mt-2 text-blue-600 hover:underline font-bold text-xs"><i class="fa-solid fa-plus mr-1"></i> Add Phone</button>
                    </div>

                    <div>
                        <label class="block font-bold mb-1">Notes</label>
                        <textarea id="edit-patient-notes" rows="3" class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                    </div>

                    <div>
                        <label class="block font-bold mb-1 text-green-600">Patient Price (سعر المريض)</label>
                        <input type="number" id="edit-patient-price" class="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-green-600">
                    </div>

                    <div class="flex justify-between pt-4 mt-4 border-t border-gray-200 dark:border-zinc-700">
                        <button type="button" onclick="deletePatient()" class="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg font-semibold transition-colors"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
                        <div class="flex gap-2">
                            <button type="button" onclick="closeEditPatientModal()" class="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600 rounded-lg font-semibold transition-colors">Cancel</button>
                            <button type="submit" id="edit-save-btn" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors shadow-lg shadow-blue-600/30"><i class="fa-solid fa-floppy-disk mr-1"></i> Save Changes</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('edit-patient-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-patient-modal') closeEditPatientModal();
    });

    document.getElementById('edit-patient-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEditedPatient();
    });
}

window.editPatient = async function(patientId) {
    ensureEditModalExists();
    
    try {
        const doc = await firebase.firestore().collection('patients').doc(patientId).get();
        if (!doc.exists) {
            alert('Patient not found.');
            return;
        }
        const data = doc.data();
        window.currentPatientOriginalStatus = data.status || 'Available';
        
        document.getElementById('edit-patient-id').value = patientId;
        document.getElementById('edit-patient-status').value = window.currentPatientOriginalStatus;
        document.getElementById('edit-patient-name').value = data.patientName || '';
        document.getElementById('edit-patient-gov').value = data.governorate || '';
        document.getElementById('edit-patient-city').value = data.city || '';
        document.getElementById('edit-patient-notes').value = data.notes || '';
        document.getElementById('edit-patient-persons').value = data.numberOfPersons || 1;
        document.getElementById('edit-patient-price').value = data.price || 0;

        // Combine Booking Info into History
        const historySection = document.getElementById('edit-history-section');
        const historyList = document.getElementById('edit-history-list');
        const history = [...(data.history || [])];
        
        // If it was booked by someone, add that as the initial "Booking" event
        if (data.bookedBy) {
            const bookedByName = await getTelegramUserName(data.bookedBy);
            history.push({
                isBooking: true,
                by: bookedByName,
                at: data.bookedAt,
                to: 'Used',
                from: 'Available'
            });
        }
        
        if (history.length > 0) {
            historySection.classList.remove('hidden');
            historyList.classList.add('hidden');
            document.getElementById('history-chevron').classList.remove('rotate-180');
            
            // Sort by date newest first
            const sortedHistory = history.sort((a, b) => {
                const dateA = a.at ? (a.at.toDate ? a.at.toDate() : new Date(a.at)) : new Date(0);
                const dateB = b.at ? (b.at.toDate ? b.at.toDate() : new Date(b.at)) : new Date(0);
                return dateB - dateA;
            });

            historyList.innerHTML = sortedHistory.map(h => {
                const date = h.at ? (h.at.toDate ? h.at.toDate() : new Date(h.at)).toLocaleString('ar-EG') : 'N/A';
                
                if (h.isBooking) {
                    return `
                        <div class="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800 text-[10px]">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest"><i class="fa-solid fa-cart-shopping mr-1"></i> تم الحجز (البوت)</span>
                                <span class="text-emerald-600/50 font-bold">${date}</span>
                            </div>
                            <div class="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-200">
                                <span>حُجز بواسطة: <span class="underline">${h.by}</span></span>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="p-2.5 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-700 text-[10px]">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-black text-blue-600 dark:text-blue-400">${h.by || 'الأدمن'}</span>
                            <span class="text-gray-400">${date}</span>
                        </div>
                        <div class="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300">
                            <span>${h.from}</span>
                            <i class="fa-solid fa-arrow-left text-[8px] text-gray-400"></i>
                            <span class="text-zinc-900 dark:text-white">${h.to}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            historySection.classList.add('hidden');
        }
        
        // Images List
        const imagesList = document.getElementById('edit-images-list');
        const currentImages = data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
        imagesList.innerHTML = '';
        
        if (currentImages.length > 0) {
            currentImages.forEach((url, idx) => {
                const div = document.createElement('div');
                div.className = 'relative aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-700 group';
                div.innerHTML = `
                    <img src="${url}" class="w-full h-full object-cover">
                    <button type="button" onclick="removeImageFromEdit(${idx})" class="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-trash"></i></button>
                `;
                div.dataset.url = url;
                imagesList.appendChild(div);
            });
        } else {
            imagesList.innerHTML = '<p class="col-span-3 text-xs text-gray-400 italic">No images attached</p>';
        }
        document.getElementById('edit-patient-image').value = '';
        
        // Cases Checkboxes
        const allCases = ['Ortho', 'Medicine', 'Pedo', 'Pros', 'Perio', 'Operative', 'Exo'];
        const patientCases = data.caseTypes || [];
        document.getElementById('edit-cases-container').innerHTML = allCases.map(c => `
            <label class="flex items-center gap-2 p-2 border rounded-lg dark:border-zinc-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700">
                <input type="checkbox" name="edit-case" value="${c}" ${patientCases.includes(c) ? 'checked' : ''} class="w-4 h-4 text-blue-600 rounded">
                <span>${c}</span>
            </label>
        `).join('');

        // Days Checkboxes
        const allDays = ['All Days', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const patientDays = (data.clinicDays || '').split(', ').map(d => d.trim());
        document.getElementById('edit-days-container').innerHTML = allDays.map(d => `
            <label class="flex items-center gap-2 p-2 border rounded-lg dark:border-zinc-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700">
                <input type="checkbox" name="edit-day" value="${d}" ${patientDays.includes(d) ? 'checked' : ''} onchange="handleEditDaySelection(this)" class="w-4 h-4 text-blue-600 rounded">
                <span>${d === 'All Days' ? 'Any Day' : d}</span>
            </label>
        `).join('');
        
        window.handleEditDaySelection = function(el) {
            const checkboxes = document.querySelectorAll('input[name="edit-day"]');
            if (el.value === "All Days" && el.checked) {
                checkboxes.forEach(cb => { if(cb.value !== "All Days") cb.checked = false; });
            } else if (el.checked) {
                checkboxes.forEach(cb => { if(cb.value === "All Days") cb.checked = false; });
            }
        };

        // Phones
        const phones = data.phoneNumbers || [];
        const phonesContainer = document.getElementById('edit-phones-container');
        phonesContainer.innerHTML = '';
        if (phones.length === 0) {
            addEditPhoneInput('');
        } else {
            phones.forEach(p => addEditPhoneInput(p));
        }

        document.getElementById('edit-patient-modal').classList.remove('hidden');
    } catch (err) {
        console.error(err);
        alert('Error loading patient: ' + err.message);
    }
}

window.closePatientInfoModal = function() {
    const modal = document.getElementById('patient-info-modal');
    if (modal) modal.classList.add('hidden');
    window.resetAdvancedFilter(); // Reset filters when closing
}

window.closeEditPatientModal = function() {
    const modal = document.getElementById('edit-patient-modal');
    if (modal) modal.classList.add('hidden');
}

window.addEditPhoneInput = function(val = '') {
    const container = document.getElementById('edit-phones-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="tel" class="edit-patient-phone flex-1 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${val}" required>
        <button type="button" onclick="this.parentElement.remove()" class="px-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"><i class="fa-solid fa-minus"></i></button>
    `;
    container.appendChild(div);
}

window.saveEditedPatient = async function() {
    const btn = document.getElementById('edit-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

    const patientId = document.getElementById('edit-patient-id').value;
    
    const cases = Array.from(document.querySelectorAll('input[name="edit-case"]:checked')).map(el => el.value);
    if (cases.length === 0) {
        alert('Please select at least one Case.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Save Changes';
        return;
    }
    
    const days = Array.from(document.querySelectorAll('input[name="edit-day"]:checked')).map(el => el.value).join(', ');
    const phones = Array.from(document.querySelectorAll('.edit-patient-phone')).map(el => el.value.trim()).filter(val => val !== '');

    try {
        const docRef = firebase.firestore().collection('patients').doc(patientId);
        
        // Get existing images from the UI (those that weren't removed)
        const existingImages = Array.from(document.querySelectorAll('#edit-images-list div')).map(el => el.dataset.url).filter(url => url);
        let finalImageUrls = [...existingImages];

        const newFiles = document.getElementById('edit-patient-image').files;
        if (newFiles.length > 0) {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${newFiles.length} New Image(s)...`;
            for (let i = 0; i < newFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', newFiles[i]);
                formData.append('upload_preset', 'patient');
                formData.append('folder', 'patients');
                
                const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/dpda74vzy/image/upload', {
                    method: 'POST',
                    body: formData
                });
                const cloudinaryData = await cloudinaryRes.json();
                if (cloudinaryData.secure_url) {
                    finalImageUrls.push(cloudinaryData.secure_url);
                }
            }
        }

        const mainDb = typeof db !== 'undefined' ? db : firebase.firestore();
        const currentAdminName = firebase.auth().currentUser ? (await mainDb.collection('users').doc(firebase.auth().currentUser.uid).get()).data().username || 'الأدمن' : 'الأدمن';

        const updatedData = {
            status: document.getElementById('edit-patient-status').value,
            patientName: document.getElementById('edit-patient-name').value.trim(),
            governorate: document.getElementById('edit-patient-gov').value,
            city: document.getElementById('edit-patient-city').value.trim(),
            notes: document.getElementById('edit-patient-notes').value.trim(),
            caseTypes: cases,
            numberOfPersons: parseInt(document.getElementById('edit-patient-persons').value) || 1,
            clinicDays: days,
            phoneNumbers: phones,
            imageUrls: finalImageUrls,
            price: parseFloat(document.getElementById('edit-patient-price').value) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastModifiedBy: currentAdminName,
            lastModifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        // Reset booking info display but KEEP data for history
        const newStatus = document.getElementById('edit-patient-status').value;
        if (newStatus !== window.currentPatientOriginalStatus) {
            updatedData.hideBookingOnCard = true;
            
            // Add to history
            updatedData.history = firebase.firestore.FieldValue.arrayUnion({
                from: window.currentPatientOriginalStatus,
                to: newStatus,
                by: currentAdminName,
                at: new Date()
            });
        }

        await docRef.update(updatedData);
        closeEditPatientModal();
    } catch (err) {
        console.error(err);
        alert('Error saving patient: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Save Changes';
    }
}

window.togglePatientHistory = function() {
    const list = document.getElementById('edit-history-list');
    const chevron = document.getElementById('history-chevron');
    const isHidden = list.classList.contains('hidden');
    
    if (isHidden) {
        list.classList.remove('hidden');
        chevron.classList.add('rotate-180');
    } else {
        list.classList.add('hidden');
        chevron.classList.remove('rotate-180');
    }
}

window.deletePatient = async function() {
    const patientId = document.getElementById('edit-patient-id').value;
    if (!confirm('Are you absolutely sure you want to delete this patient? This cannot be undone.')) return;
    
    try {
        const doc = await firebase.firestore().collection('patients').doc(patientId).get();
        const data = doc.data();
        const patientName = data ? (data.patientName || 'بدون اسم') : 'Unknown';

        await firebase.firestore().collection('patients').doc(patientId).delete();
        
        // Log event
        if (window.logSystemEvent) {
            await window.logSystemEvent('delete_patient', `قام بحذف مريض: ${patientName}`);
        }
        
        closeEditPatientModal();
    } catch (err) {
        console.error(err);
        alert('Error deleting patient: ' + err.message);
    }
}
window.removeImageFromEdit = function(idx) {
    const list = document.getElementById('edit-images-list');
    const items = list.querySelectorAll('div');
    if (items[idx]) {
        items[idx].remove();
    }
    // Update indices for other buttons if necessary
    const newItems = list.querySelectorAll('div');
    if (newItems.length === 0) {
        list.innerHTML = '<p class="col-span-3 text-xs text-gray-400 italic">No images attached</p>';
    } else {
        newItems.forEach((item, i) => {
            const btn = item.querySelector('button');
            if (btn) btn.setAttribute('onclick', `removeImageFromEdit(${i})`);
        });
    }
}
