/* ==========================================
 * 1. FIREBASE CONFIG
 * ========================================== */
const firebaseConfig = {
    apiKey: "AIzaSyAKevus2EJpkIaHeuR3DTutSgUOzkZunQg",
    authDomain: "main-admin-and-admin.firebaseapp.com",
    projectId: "main-admin-and-admin",
    storageBucket: "main-admin-and-admin.firebasestorage.app",
    messagingSenderId: "691604476037",
    appId: "1:691604476037:web:9fe647e73de1ea699e19ec",
    measurementId: "G-VSHWQWTW21"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

/* ==========================================
 * 2. I18N
 * ========================================== */
const translations = {
    en: {
        'dashboard-title': 'System Dashboard',
        'logout': 'Logout',
        'save': 'Save',
        'cancel': 'Cancel',
        'delete': 'Delete',
        'edit': 'Edit',
        'search-placeholder': 'Search by name, city, case...',
        'any-day': 'Any Day',
        'all-days': 'All Days',
        'manage-admins': 'Manage Admins',
        'manage-admins-desc': 'Create, edit, delete, and control',
        'add-patient': 'Add Patient',
        'add-patient-desc': 'New patient database entry',
        'patient-info': 'Patient Info',
        'patient-info-desc': 'Manage patient statuses',
        'telegram-users': 'Telegram Users',
        'available': 'Available',
        'pending': 'Pending',
        'used': 'Used',
        'all-statuses': 'All Statuses',
        'all-time': 'All Time',
        'last-24h': 'Last 24 Hours',
        'last-week': 'Last Week',
        'last-month': 'Last Month',
        'last-year': 'Last Year',
        'governorate': 'Governorate',
        'city': 'City / Region',
        'specialization': 'Specialization / Cases',
        'persons': 'Number of Persons',
        'clinic-days': 'Clinic Days',
        'patient-name': 'Patient Name',
        'phone-numbers': 'Phone Numbers',
        'notes': 'Notes',
        'patient-photos': 'Patient Photos',
        'advanced-filter': 'Advanced Filter',
        'reset-all': 'Reset All',
        'apply-filters': 'Apply Filters',
        'Sunday': 'Sunday',
        'Monday': 'Monday',
        'Tuesday': 'Tuesday',
        'Wednesday': 'Wednesday',
        'Thursday': 'Thursday',
        'Friday': 'Friday',
        'Saturday': 'Saturday',
        'Ortho': 'Ortho',
        'Medicine': 'Medicine',
        'Pedo': 'Pedo',
        'Pros': 'Pros',
        'Perio': 'Perio',
        'Operative': 'Operative',
        'Exo': 'Exo'
    },
    ar: {
        'dashboard-title': 'لوحة تحكم النظام',
        'logout': 'تسجيل الخروج',
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'delete': 'حذف',
        'edit': 'تعديل',
        'search-placeholder': 'البحث بالاسم، المدينة، الحالة...',
        'any-day': 'أي يوم',
        'all-days': 'جميع الأيام',
        'manage-admins': 'إدارة الحسابات',
        'manage-admins-desc': 'إنشاء، تعديل، وحذف الحسابات',
        'add-patient': 'إضافة مريض',
        'add-patient-desc': 'إدخال بيانات مريض جديد',
        'patient-info': 'بيانات المرضى',
        'patient-info-desc': 'إدارة حالات المراجعات',
        'telegram-users': 'مستخدمين التليجرام',
        'available': 'متوفر',
        'pending': 'معلق',
        'used': 'تم الاستخدام',
        'all-statuses': 'جميع الحالات',
        'all-time': 'كل الأوقات',
        'last-24h': 'آخر 24 ساعة',
        'last-week': 'آخر أسبوع',
        'last-month': 'آخر شهر',
        'last-year': 'آخر سنة',
        'governorate': 'المحافظة',
        'city': 'المدينة / المنطقة',
        'specialization': 'التخصص / الحالة',
        'persons': 'عدد الأشخاص',
        'clinic-days': 'أيام العيادة',
        'patient-name': 'اسم المريض',
        'phone-numbers': 'أرقام الهاتف',
        'notes': 'ملاحظات',
        'patient-photos': 'صور الحالة',
        'advanced-filter': 'فلترة متقدمة',
        'reset-all': 'إعادة تعيين',
        'apply-filters': 'تطبيق البحث',
        'Sunday': 'الأحد',
        'Monday': 'الاثنين',
        'Tuesday': 'الثلاثاء',
        'Wednesday': 'الأربعاء',
        'Thursday': 'الخميس',
        'Friday': 'الجمعة',
        'Saturday': 'السبت',
        'Ortho': 'تقويم',
        'Medicine': 'طب أسنان',
        'Pedo': 'أطفال',
        'Pros': 'صناعة أسنان',
        'Perio': 'لثة',
        'Operative': 'حشوات',
        'Exo': 'قلع'
    }
};

let currentLang = localStorage.getItem('clinicLang') || 'en';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('clinicLang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = translations[lang][key];
            } else if (el.tagName === 'SELECT') {
                el.querySelectorAll('option[data-i18n]').forEach(opt => {
                    const optKey = opt.dataset.i18n;
                    if (translations[lang][optKey]) opt.textContent = translations[lang][optKey];
                });
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    if (window.filterPatients) window.filterPatients();
    updateLangBtn();
}

function updateLangBtn() {
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.textContent = currentLang === 'en' ? 'العربية' : 'English';
    }
}

window.toggleLanguage = function () {
    setLanguage(currentLang === 'en' ? 'ar' : 'en');
};

document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
});

/* ==========================================
 * 3. UTILS
 * ========================================== */
if (typeof window.currentUserData === 'undefined') {
    window.currentUserData = null;
}

window.can = function (permission) {
    if (!window.currentUserData) {
        console.warn(`[Perms] can(${permission}) called but currentUserData is null`);
        return false;
    }
    const role = (window.currentUserData.role || '').toLowerCase();
    if (role === 'main_admin') return true;
    const hasPerm = !!(window.currentUserData.permissions && window.currentUserData.permissions[permission]);
    return hasPerm;
};

window.logSystemEvent = async function (type, details) {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        const database = typeof db !== 'undefined' ? db : firebase.firestore();
        const userDoc = await database.collection('users').doc(currentUser.uid).get();
        const userName = userDoc.exists ? (userDoc.data().username || userDoc.data().name || 'Unknown') : 'Unknown';
        await database.collection('system_logs').add({
            type,
            details,
            userName,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Error logging system event:", e);
    }
}

/* ==========================================
 * 4. AUTH
 * ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn ? loginBtn.querySelector('.btn-text') : null;
    const spinner = loginBtn ? loginBtn.querySelector('.spinner') : null;

    const userMap = {
        'mahmoudadel': 'mahmod.adil2001@gmail.com',
        'admin': 'admin@main-admin-and-admin.firebaseapp.com'
    };

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            redirectUser(user);
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            errorMessage.textContent = '';
            setLoading(true);

            if (userMap[username]) {
                loginWithEmail(userMap[username], password);
                return;
            }

            if (username.includes('@')) {
                loginWithEmail(username, password);
                return;
            }

            const database = typeof db !== 'undefined' ? db : firebase.firestore();
            database.collection('users').where('username', '==', username).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        setLoading(false);
                        errorMessage.textContent = 'Invalid username or password.';
                        return;
                    }
                    const realEmail = snapshot.docs[0].data().email;
                    loginWithEmail(realEmail, password);
                })
                .catch(err => {
                    setLoading(false);
                    console.error("Firestore lookup error:", err);
                    errorMessage.textContent = 'Error: Make sure Firestore Rules allow read: if true;';
                });

            function loginWithEmail(emailToUse, passToUse) {
                firebase.auth().signInWithEmailAndPassword(emailToUse, passToUse)
                    .then((userCredential) => {
                        redirectUser(userCredential.user);
                    })
                    .catch((error) => {
                        setLoading(false);
                        let message = error.message;
                        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                            message = 'Invalid username or password.';
                        }
                        errorMessage.textContent = message;
                    });
            }
        });
    }

    function setLoading(isLoading) {
        if (!loginBtn) return;
        if (isLoading) {
            loginBtn.disabled = true;
            if (btnText) btnText.textContent = 'Logging in...';
            if (spinner) spinner.classList.remove('hidden');
        } else {
            loginBtn.disabled = false;
            if (btnText) btnText.textContent = 'Login';
            if (spinner) spinner.classList.add('hidden');
        }
    }

    function redirectUser(user) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        if (user.email === 'mahmod.adil2001@gmail.com') {
            if (currentPage !== 'main-admin.html') {
                window.location.href = 'main-admin.html';
            }
            return;
        }

        setLoading(true);
        if (btnText) btnText.textContent = 'Redirecting...';

        const database = typeof db !== 'undefined' ? db : firebase.firestore();
        database.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const role = doc.data().role;
                    let targetPage = 'admin.html';

                    if (role === 'main_admin') {
                        targetPage = 'main-admin.html';
                    }

                    if (currentPage !== targetPage) {
                        window.location.href = targetPage;
                    } else {
                        setLoading(false);
                    }
                } else {
                    firebase.auth().signOut();
                    setLoading(false);
                    if (errorMessage) errorMessage.textContent = 'Account disabled or deleted.';
                }
            })
            .catch(err => {
                console.error("Error fetching user role:", err);
                if (currentPage !== 'admin.html') {
                    window.location.href = 'admin.html';
                }
            });
    }
});
