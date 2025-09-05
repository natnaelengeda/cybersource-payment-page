
// Module-level fingerprint/session id — populated from iframe response or generated as fallback
let _fingerprintSessionId = '';

// Function to receive configuration from Flutter
window.receiveDataCollectionConfig = function (config) {
    const form = document.getElementById('cardinal_collection_form');
    const input = document.getElementById('cardinal_collection_form_input');
    form.action = config.deviceDataCollectionUrl;
    input.value = config.accessToken;

    form.submit();

    // Listen for the response from Cardinal
    window.addEventListener("message", async function (event) {
        if (event.origin === "https://centinelapistag.cardinalcommerce.com") {
            // Try to extract a session/fingerprint id from the Cardinal response.
            // Cardinal may return a JSON object or a JWT-like string; handle both.
            function extractFingerprintSessionId(data) {
                try {
                    if (!data) return '';
                    let parsed = data;
                    if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch (e) { /* keep string */ }
                    }
                    if (typeof parsed === 'object' && parsed !== null) {
                        return parsed.sessionId || parsed.SessionId || parsed.session_id || parsed.fingerprintSessionId || parsed.fpsid || '';
                    }
                    if (typeof parsed === 'string') {
                        // match sessionId=... or session_id=...
                        const m = parsed.match(/session(?:Id|_id)?=([^&\s]+)/i);
                        if (m) return m[1];
                        // if looks like a JWT, return it as an identifier
                        if (parsed.split('.').length === 3) return parsed;
                    }
                    return '';
                } catch (e) {
                    return '';
                }
            }

            const ddcInfo = { ddc: event.data };
            console.log('[DDC]', ddcInfo);
            const extracted = extractFingerprintSessionId(event.data);
            if (extracted) {
                _fingerprintSessionId = extracted;
                console.log('[DDC] extracted fingerprintSessionId:', _fingerprintSessionId);
            }

            if (typeof AuthSetupHandler !== 'undefined' && AuthSetupHandler && typeof AuthSetupHandler.postMessage === 'function') {
                AuthSetupHandler.postMessage(JSON.stringify(ddcInfo));
            } else {
                console.warn('AuthSetupHandler not available');
            }
        }

        const deviceInfo = await getDeviceInformation();
        console.log('[DeviceInfo]', JSON.stringify(deviceInfo));
        if (typeof AuthSetupHandler !== 'undefined' && AuthSetupHandler && typeof AuthSetupHandler.postMessage === 'function') {
            AuthSetupHandler.postMessage(JSON.stringify({ deviceInfo }));
        } else {
            console.warn('AuthSetupHandler not available');
        }
    }, false);
};

// get public/external IP (falls back to empty string on error)
async function getPublicIp() {
    try {
        const r = await fetch('https://api.ipify.org?format=json'); // or https://ipinfo.io/json
        if (!r.ok) return '';
        const j = await r.json();
        return j.ip || '';
    } catch (e) {
        return '';
    }
}

// gather device info (now async so it can await the IP)
async function getDeviceInformation() {
    const publicIp = await getPublicIp();
    // ensure there is a usable fingerprint/session id; if not, create a stable fallback
    if (!_fingerprintSessionId) {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                _fingerprintSessionId = crypto.randomUUID();
            } else {
                // simple UUID v4 fallback
                _fingerprintSessionId = 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        } catch (e) {
            _fingerprintSessionId = String(Date.now());
        }
    }

    return {
        ipAddress: publicIp, // public IP (may be ISP NAT IP)
        fingerprintSessionId: _fingerprintSessionId,
        httpAcceptBrowserValue: navigator.userAgent,
        httpAcceptContent: 'application/json',
        httpBrowserLanguage: navigator.language || navigator.userLanguage,
        httpBrowserJavaEnabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false,
        httpBrowserJavaScriptEnabled: true,
        httpBrowserColorDepth: String(screen.colorDepth || ''),
        httpBrowserScreenHeight: String(screen.height || ''),
        httpBrowserScreenWidth: String(screen.width || ''),
        httpBrowserTimeDifference: String(new Date().getTimezoneOffset()),
        userAgentBrowserValue: navigator.userAgent
    };
}
