document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.spinner');

    // Mappings for simple username login to firebase email auth
    const userMap = {
        'mahmoudadel': 'mahmod.adil2001@gmail.com',
        'admin': 'admin@main-admin-and-admin.firebaseapp.com' // Example for second admin
    };

    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            redirectUser(user);
        }
    });

    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = usernameInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            
            errorMessage.textContent = '';
            
            setLoading(true);

            // 1. Check if it's the Main Admin shortcut
            if (userMap[username]) {
                loginWithEmail(userMap[username], password);
                return;
            }

            // 2. If they explicitly typed an email, login directly
            if (username.includes('@')) {
                loginWithEmail(username, password);
                return;
            }

            // 3. Otherwise, it's a Username. Look up their real email in Firestore!
            const db = firebase.firestore();
            db.collection('users').where('username', '==', username).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        setLoading(false);
                        errorMessage.textContent = 'Invalid username or password.';
                        return;
                    }
                    // Found the user! Get their actual auth email
                    const realEmail = snapshot.docs[0].data().email;
                    loginWithEmail(realEmail, password);
                })
                .catch(err => {
                    setLoading(false);
                    console.error("Firestore lookup error:", err);
                    errorMessage.textContent = 'Error: Make sure Firestore Rules allow read: if true;';
                });

            // Helper function to actually login
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
            btnText.textContent = 'Logging in...';
            spinner.classList.remove('hidden');
        } else {
            loginBtn.disabled = false;
            btnText.textContent = 'Login';
            spinner.classList.add('hidden');
        }
    }

    function redirectUser(user) {
        if (user.email === 'mahmod.adil2001@gmail.com') {
            window.location.href = 'main-admin.html';
            return;
        }
        
        // Ensure we show loading state while checking role
        setLoading(true);
        if (btnText) btnText.textContent = 'Redirecting...';
        
        firebase.firestore().collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const role = doc.data().role;
                    if (role === 'customer') {
                        window.location.href = 'customer.html';
                    } else if (role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'admin.html'; // Fallback
                    }
                } else {
                    firebase.auth().signOut();
                    setLoading(false);
                    if (errorMessage) errorMessage.textContent = 'Account disabled or deleted.';
                }
            })
            .catch(err => {
                console.error("Error fetching user role:", err);
                window.location.href = 'admin.html';
            });
    }
});
