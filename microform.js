const form = document.querySelector('#my-sample-form');
const payButton = document.querySelector('#pay-button');
const flexResponse = document.querySelector('#flexresponse');
const errorsOutput = document.getElementById('errors-output');

const myStyles = {
    'input': {
        'font-size': '14px',
        'font-family': 'helvetica, tahoma, calibri, sans-serif',
        'color': '#555'
    },
    ':focus': { 'color': 'blue' },
    ':disabled': { 'cursor': 'not-allowed' },
    'valid': { 'color': '#3c763d' },
    'invalid': { 'color': '#a94442' }
};

window.receiveMicroformConfig = function (config) {
    console.log("Received config:", config);
    try {
        if (!config.clientLibrary || !config.captureContext) {
            throw new Error('Invalid microform config - missing fields');
        }
        window._microformConfig = config;
        loadMicroformScript(config.clientLibrary, config.clientLibraryIntegrity)
            .then(() => initMicroform(config.captureContext))
            .catch(reportError);
    } catch (e) {
        reportError(e.message || String(e));
    }
};

function loadMicroformScript(src, integrity) {
    return new Promise(function (resolve, reject) {
        if (window.Flex) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        if (integrity) s.integrity = integrity;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load microform library'));
        document.head.appendChild(s);
    });
}

function initMicroform(captureContext) {
    if (!window.Flex) throw new Error('Flex library not present after load');

    // Create flex + microform AFTER library is loaded
    const flex = new Flex(captureContext);
    const microform = flex.microform({ styles: myStyles });

    const numberField = microform.createField('number', { placeholder: '•••• •••• •••• ••••' });
    const securityCodeField = microform.createField('securityCode', { placeholder: '•••' });
    numberField.load('#number-container');
    securityCodeField.load('#securityCode-container');

    console.log('Microform ready!');

    payButton.addEventListener('click', function () {
        const options = {
            expirationMonth: document.querySelector('#expMonth').value,
            expirationYear: document.querySelector('#expYear').value
        };

        console.log('Creating token with options: ');
        console.log("expirationMonth", options.expirationMonth);
        console.log("expirationYear", options.expirationYear);

        const cardholderName = document.querySelector('#cardholderName').value;
        console.log("cardholderName", cardholderName);

        microform.createToken(options, function (err, token) {
            if (err) {
                JSON.stringify(err, null, 2);
                errorsOutput.textContent = err.message;
            } else {
                console.log("Transient Token is: ", JSON.stringify(token));
                flexResponse.value = JSON.stringify(token);
                Logger.postMessage(token);
                form.submit();
            }
        });
    });
}

function reportError(msg) {
    console.error('Microform error:', msg);
    errorsOutput.textContent = msg;
}