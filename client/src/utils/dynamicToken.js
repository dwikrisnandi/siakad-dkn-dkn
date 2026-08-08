export const WINDOW_MINUTES = 5;

export function getDynamicToken(baseToken) {
    if (!baseToken) return "";
    const window = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000));
    
    // Create a simple deterministic hash from baseToken + window
    let hash = 0;
    const str = baseToken.toString() + "_" + window;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    
    // Return a 6-character hex string (uppercase)
    return Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-6);
}

export function validateDynamicToken(baseToken, inputToken) {
    if (!baseToken) return true; // If no token required by exam
    if (!inputToken) return false;
    
    inputToken = inputToken.toString().trim().toUpperCase();
    
    const currentWindow = Math.floor(Date.now() / (WINDOW_MINUTES * 60 * 1000));
    
    const generateForWindow = (win) => {
        let hash = 0;
        const str = baseToken.toString() + "_" + win;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-6);
    };
    
    // Accept current window or previous window (5 min grace period)
    return inputToken === generateForWindow(currentWindow) || 
           inputToken === generateForWindow(currentWindow - 1);
}
