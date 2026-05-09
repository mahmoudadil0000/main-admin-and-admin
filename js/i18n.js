const translations = {
    en: {
        // General
        'dashboard-title': 'System Dashboard',
        'logout': 'Logout',
        'save': 'Save',
        'cancel': 'Cancel',
        'delete': 'Delete',
        'edit': 'Edit',
        'search-placeholder': 'Search by name, city, case...',
        'any-day': 'Any Day',
        'all-days': 'All Days',
        
        // Main Admin Cards
        'manage-admins': 'Manage Admins',
        'manage-admins-desc': 'Create, edit, delete, and control',
        'add-patient': 'Add Patient',
        'add-patient-desc': 'New patient database entry',
        'patient-info': 'Patient Info',
        'patient-info-desc': 'Manage patient statuses',
        
        // Statuses
        'available': 'Available',
        'pending': 'Pending',
        'used': 'Used',
        'all-statuses': 'All Statuses',
        
        // Times
        'all-time': 'All Time',
        'last-24h': 'Last 24 Hours',
        'last-week': 'Last Week',
        'last-month': 'Last Month',
        'last-year': 'Last Year',
        
        // Form Labels
        'governorate': 'Governorate',
        'city': 'City / Region',
        'specialization': 'Specialization / Cases',
        'persons': 'Number of Persons',
        'clinic-days': 'Clinic Days',
        'patient-name': 'Patient Name',
        'phone-numbers': 'Phone Numbers',
        'notes': 'Notes',
        'patient-photos': 'Patient Photos',
        
        // Advanced Filter
        'advanced-filter': 'Advanced Filter',
        'reset-all': 'Reset All',
        'apply-filters': 'Apply Filters',
        
        // Days
        'Sunday': 'Sunday',
        'Monday': 'Monday',
        'Tuesday': 'Tuesday',
        'Wednesday': 'Wednesday',
        'Thursday': 'Thursday',
        'Friday': 'Friday',
        'Saturday': 'Saturday',
        
        // Cases
        'Ortho': 'Ortho',
        'Medicine': 'Medicine',
        'Pedo': 'Pedo',
        'Pros': 'Pros',
        'Perio': 'Perio',
        'Operative': 'Operative',
        'Exo': 'Exo'
    },
    ar: {
        // General
        'dashboard-title': 'لوحة تحكم النظام',
        'logout': 'تسجيل الخروج',
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'delete': 'حذف',
        'edit': 'تعديل',
        'search-placeholder': 'البحث بالاسم، المدينة، الحالة...',
        'any-day': 'أي يوم',
        'all-days': 'جميع الأيام',
        
        // Main Admin Cards
        'manage-admins': 'إدارة الحسابات',
        'manage-admins-desc': 'إنشاء، تعديل، وحذف الحسابات',
        'add-patient': 'إضافة مريض',
        'add-patient-desc': 'إدخال بيانات مريض جديد',
        'patient-info': 'بيانات المرضى',
        'patient-info-desc': 'إدارة حالات المراجعات',
        
        // Statuses
        'available': 'متوفر',
        'pending': 'معلق',
        'used': 'تم الاستخدام',
        'all-statuses': 'جميع الحالات',
        
        // Times
        'all-time': 'كل الأوقات',
        'last-24h': 'آخر 24 ساعة',
        'last-week': 'آخر أسبوع',
        'last-month': 'آخر شهر',
        'last-year': 'آخر سنة',
        
        // Form Labels
        'governorate': 'المحافظة',
        'city': 'المدينة / المنطقة',
        'specialization': 'التخصص / الحالة',
        'persons': 'عدد الأشخاص',
        'clinic-days': 'أيام العيادة',
        'patient-name': 'اسم المريض',
        'phone-numbers': 'أرقام الهاتف',
        'notes': 'ملاحظات',
        'patient-photos': 'صور الحالة',
        
        // Advanced Filter
        'advanced-filter': 'فلترة متقدمة',
        'reset-all': 'إعادة تعيين',
        'apply-filters': 'تطبيق البحث',
        
        // Days
        'Sunday': 'الأحد',
        'Monday': 'الاثنين',
        'Tuesday': 'الثلاثاء',
        'Wednesday': 'الأربعاء',
        'Thursday': 'الخميس',
        'Friday': 'الجمعة',
        'Saturday': 'السبت',
        
        // Cases
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
    
    // Update static text
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = translations[lang][key];
            } else if (el.tagName === 'SELECT') {
                // Handle options inside select if they have data-i18n
                el.querySelectorAll('option[data-i18n]').forEach(opt => {
                    const optKey = opt.dataset.i18n;
                    if (translations[lang][optKey]) opt.textContent = translations[lang][optKey];
                });
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    // Re-render patients if possible
    if (window.filterPatients) window.filterPatients();
    
    updateLangBtn();
}

function updateLangBtn() {
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.textContent = currentLang === 'en' ? 'العربية' : 'English';
    }
}

window.toggleLanguage = function() {
    setLanguage(currentLang === 'en' ? 'ar' : 'en');
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
});
