// Book Patient Wizard Logic
let cStep = 1;
const cTotalSteps = 4;

window.openBookPatientModal = function() {
    console.log("Attempting to open modal...");
    const modal = document.getElementById('book-patient-modal');
    if (modal) {
        modal.classList.remove('hidden');
        cStep = 1;
        const form = document.getElementById('book-patient-form');
        if (form) form.reset();
        updateCWizardUI();
    } else {
        console.error("Modal #book-patient-modal not found!");
    }
}

window.closeBookPatientModal = function() {
    const modal = document.getElementById('book-patient-modal');
    if (modal) modal.classList.add('hidden');
}

function updateCWizardUI() {
    document.querySelectorAll('.c-step-content').forEach(el => el.classList.add('hidden'));
    
    const currentStepEl = document.getElementById(`c-step-${cStep}`);
    if (currentStepEl) currentStepEl.classList.remove('hidden');
    
    const cProgressBar = document.getElementById('c-step-progress-bar');
    const progress = ((cStep - 1) / (cTotalSteps - 1)) * 100;
    if (cProgressBar) cProgressBar.style.width = `${progress}%`;
    
    for (let i = 1; i <= cTotalSteps; i++) {
        const indicator = document.getElementById(`c-indicator-${i}`);
        if (indicator) {
            if (i <= cStep) {
                indicator.classList.remove('bg-gray-200', 'dark:bg-zinc-700', 'text-gray-500');
                indicator.classList.add('bg-blue-600', 'text-white');
            } else {
                indicator.classList.add('bg-gray-200', 'dark:bg-zinc-700', 'text-gray-500');
                indicator.classList.remove('bg-blue-600', 'text-white');
            }
        }
    }
    
    const btnPrev = document.getElementById('c-btn-prev');
    const btnNext = document.getElementById('c-btn-next');
    if (btnPrev) btnPrev.classList.toggle('hidden', cStep === 1);
    if (btnNext) btnNext.classList.toggle('hidden', cStep === cTotalSteps);
}

function validateCStep(step) {
    if (step === 1) {
        const gov = document.getElementById('c-patient-gov').value;
        if (!gov) { alert('Please select a Governorate.'); return false; }
    } else if (step === 2) {
        const checked = document.querySelectorAll('input[name="c-patient-case"]:checked').length;
        if (checked === 0) { alert('Please select at least one Case.'); return false; }
    } else if (step === 3) {
        const day = document.querySelector('input[name="c-patient-days"]:checked');
        if (!day) { alert('Please select a Day.'); return false; }
    }
    return true;
}

window.searchPatients = function() {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<p class="text-center text-gray-500 py-8"><i class="fa-solid fa-circle-notch fa-spin"></i> Searching available patients...</p>';
    
    const gov = document.getElementById('c-patient-gov').value;
    const selectedCases = Array.from(document.querySelectorAll('input[name="c-patient-case"]:checked')).map(el => el.value);
    const dayEl = document.querySelector('input[name="c-patient-days"]:checked');
    const day = dayEl ? dayEl.value : 'All Days';
    
    firebase.firestore().collection('patients')
        .where('governorate', '==', gov)
        .get()
        .then(snapshot => {
            resultsContainer.innerHTML = '';
            
            let matchedDocs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const actualStatus = data.status || 'Available';
                if (actualStatus !== 'Available') return;
                
                if (day !== 'All Days' && data.clinicDays !== 'All Days' && data.clinicDays !== day) return;
                
                const pCases = data.caseTypes || [];
                const hasMatch = selectedCases.some(c => pCases.includes(c));
                if (!hasMatch) return;
                
                matchedDocs.push({id: doc.id, data: data});
            });
            
            if (matchedDocs.length === 0) {
                resultsContainer.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-folder-open text-4xl mb-3 opacity-20"></i><p>No available patients match your search criteria.</p></div>';
                return;
            }
            
            matchedDocs.forEach(item => {
                const data = item.data;
                const pCases = (data.caseTypes || []).join(', ');
                const rawPhones = data.phoneNumbers || [];
                let maskedPhones = 'No phone available';
                if (rawPhones.length > 0) {
                    maskedPhones = rawPhones.map(p => (p.length <= 6) ? 'XXXXXX' : 'XXXXXX' + p.slice(6)).join(' | ');
                }
                
                const card = document.createElement('div');
                card.className = 'bg-white dark:bg-zinc-800 p-5 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm mb-4 animate-fade-in-up';
                
                const images = data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
                let imageHtml = images.length > 0 ? `
                    <div class="grid grid-cols-1 gap-2 mb-4">
                        <img src="${images[0]}" class="w-full max-h-80 object-contain rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 cursor-pointer" onclick="window.open('${images[0]}', '_blank')">
                    </div>
                ` : '';
                
                card.innerHTML = `
                    ${imageHtml}
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-bold text-lg text-blue-600 dark:text-blue-400">Patient Case <span class="text-xs text-gray-400 font-normal ml-2">#${item.id.slice(-4)}</span></h3>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p><i class="fa-solid fa-location-dot w-5 text-center text-gray-400"></i> Location: <span class="font-bold">${data.governorate} | ${data.city || 'N/A'}</span></p>
                        <p><i class="fa-solid fa-tooth w-5 text-center text-gray-400"></i> Cases: <span class="font-bold">${pCases}</span></p>
                        <p><i class="fa-solid fa-calendar-days w-5 text-center text-gray-400"></i> Day: <span class="font-bold">${data.clinicDays}</span></p>
                        <p><i class="fa-solid fa-phone w-5 text-center text-gray-400"></i> Phone: <span class="font-mono bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded tracking-widest">${maskedPhones}</span></p>
                    </div>
                    <button onclick="bookPatient('${item.id}', this)" class="w-full mt-5 py-4 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-check"></i> <span>Book Now</span>
                    </button>
                `;
                resultsContainer.appendChild(card);
            });
        }).catch(err => {
            console.error("Search error:", err);
            resultsContainer.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${err.message}</p>`;
        });
}

window.bookPatient = async function(patientId, btn) {
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Booking...';
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("Please log in first.");

        await firebase.firestore().collection('patients').doc(patientId).update({
            status: 'Pending',
            bookedBy: user.uid,
            bookedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        btn.className = 'w-full mt-5 py-4 rounded-xl bg-green-500 text-white font-black text-sm flex items-center justify-center gap-2';
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Booked!';
        setTimeout(() => closeBookPatientModal(), 1500);
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const btnNext = document.getElementById('c-btn-next');
    const btnPrev = document.getElementById('c-btn-prev');
    const modal = document.getElementById('book-patient-modal');

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (validateCStep(cStep)) {
                cStep++;
                updateCWizardUI();
                if (cStep === 4) searchPatients();
            }
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (cStep > 1) {
                cStep--;
                updateCWizardUI();
            }
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeBookPatientModal();
        });
    }
});
