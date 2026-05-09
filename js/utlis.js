// Shared Logging Helper
window.logSystemEvent = async function(type, details) {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        
        // Use the global db if available, otherwise initialize it
        const database = typeof db !== 'undefined' ? db : firebase.firestore();
        
        // Fetch current user details for the log
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
