
// Function to receive configuration from Flutter
window.receiveDataCollectionConfig = function (config) {
    const form = document.getElementById('cardinal_collection_form');
    const input = document.getElementById('cardinal_collection_form_input');

    form.action = config.deviceDataCollectionUrl;

    input.value = config.accessToken;

    form.submit();
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
    return {
        ipAddress: publicIp, // public IP (may be ISP NAT IP)
        fingerprintSessionId: '', // will be set from iframe response if needed
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
// Listen for the response from Cardinal
window.addEventListener("message", async function (event) {
    if (event.origin === "https://centinelapistag.cardinalcommerce.com") {
        // Send the result back to Flutter
        const ddcInfo = { ddc: event.data };
        console.log('[DDC]', ddcInfo);
        if (typeof AuthSetupHandler !== 'undefined' && AuthSetupHandler && typeof AuthSetupHandler.postMessage === 'function') {
            AuthSetupHandler.postMessage(JSON.stringify(ddcInfo));
        }
    }

    const deviceInfo = await getDeviceInformation();
    console.log('[DeviceInfo]', JSON.stringify(deviceInfo));
    if (typeof AuthSetupHandler !== 'undefined' && AuthSetupHandler && typeof AuthSetupHandler.postMessage === 'function') {
        AuthSetupHandler.postMessage(JSON.stringify({ deviceInfo }));
    }
}, false);