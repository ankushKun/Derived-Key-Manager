
const BASE = "https://love4src.com/api/v0/";
// const BASE = "https://api.desodev.com/api/v0/";


var init = false;
var pendingRequests = [];
var identityWindow = null;
var iframe = null;
var loggedInPubKey;
$(".show-on-login").hide();

function login() {
    identityWindow = window.open('https://identity.deso.org/log-in', null, 'toolbar=no, width=600, height=800, top=0, left=0');
}

function createDerivedKey() {
    identityWindow = window.open('https://identity.deso.org/derive', null, 'toolbar=no, width=600, height=800, top=0, left=0');
}

function logout() {
    identityWindow = window.open(`https://identity.deso.org/logout?publicKey=${loggedInPubKey}`, null, 'toolbar=no, width=600, height=800, top=0, left=0');
}

function approveTxn(TxnHash) {
    identityWindow = window.open(`https://identity.deso.org/approve?tx=${TxnHash}`, null, 'toolbar=no, width=600, height=800, top=0, left=0');
}


function handleInit(e) {
    if (!init) {
        init = true;
        iframe = document.getElementById("identity");

        for (const e of pendingRequests) {
            postMessage(e);
        }

        pendingRequests = []
    }
    respond(e.source, e.data.id, {})
}

async function handleLogin(payload) {
    if (identityWindow) {
        identityWindow.close();
        identityWindow = null;
        if (payload.publicKeyAdded) {
            loggedInPubKey = payload.publicKeyAdded;
            console.log(loggedInPubKey + " logged in");

            $(".hidden-on-login").hide();
            $(".show-on-login").show();
            getDerivedKeys();
        }
        else if (payload.signedTransactionHex) {
            // console.log(payload);
            const signedHex = payload.signedTransactionHex;
            axios.post(BASE + "submit-transaction", { "transactionHex": signedHex })
                .then((e) => {
                    if (e.data == "200") {
                        alert("Revoked access from a derived key!");
                        getDerivedKeys();
                    } else {
                        alert(`Failed to revoke access\nError ${e.data}`);
                        getDerivedKeys();
                    }
                });
        }
        else {
            window.location.reload();
        }


    }
}
async function handleDerive(payload) {
    if (identityWindow) {
        identityWindow.close();
        identityWindow = null;
        console.log("payload", payload);
        loggedInPubKey = payload.publicKey;
        const derivedSeedHex = payload.derivedSeedHex;
        let authorizeEndpoint = BASE + "authorize-derived-key";
        let authorizePayload = {
            OwnerPublicKeyBase58Check: payload.publicKey,
            DerivedPublicKeyBase58Check: payload.derivedPublicKey,
            ExpirationBlock: payload.expirationBlock,
            AccessSignature: payload.accessSignature,
            DeleteKey: false,
            DerivedKeySignature: true,
            MinFeeRateNanosPerKB: 1000
        }
        console.log(authorizeEndpoint, authorizePayload);
        let SignedTxnHex;
        axios.post(authorizeEndpoint, authorizePayload).then((res) => {
            console.log(res.data);
            TxnHex = res.data.TransactionHex;
            SignedTxnHex = signTransaction(derivedSeedHex, TxnHex);
            console.log(SignedTxnHex);
            let submitEndpoint = BASE + "submit-transaction";
            let submitPayload = { TransactionHex: SignedTxnHex }
            axios.post(submitEndpoint, submitPayload).then((res) => {
                console.log(res.data);
                $(".popup").show();
                $(".popup-body").append(`<h2>Derived Public Key</h2>
                    <h3 id="derived-public-key">${payload.derivedPublicKey}</h3>
                    <h2>Derived Seed Hex</h2>
                    <h3 id="derived-seed-hex">${derivedSeedHex}</h3>
                    <h2>Access Signature</h2>
                    <h3 id="access-signature">${payload.accessSignature}</h3>
                    <h2>Expiration Block</h2>
                    <h3 id="expiration-block">${payload.expirationBlock}</h3>`)
            }).catch((err) => {
                $(".popup").show();
                $(".popup-body").append(`<h3>Error ${err.response.status} during submitting transaction<br>${JSON.stringify(err.response.data)}<br>Failed to generate key</h3>`);
            });
        }).catch((err) => {
            $(".popup").show();
            $(".popup-body").append(`<h3>Error ${err.response.status} during generating transaction<br>${JSON.stringify(err.response.data)}<br>Failed to generate key</h3>`);
        }).then(getDerivedKeys());
    }
}
async function handleLogout(payload) {
    if (identityWindow) {
        identityWindow.close();
        identityWindow = null;
    }
}

function respond(e, t, n) {
    e.postMessage({
        id: t,
        service: "identity",
        payload: n
    }, "*")
}

function postMessage(e) {
    init ? this.iframe.contentWindow.postMessage(e, "*") : pendingRequests.push(e)
}

// const childWindow = document.getElementById('identity').contentWindow;
window.addEventListener('message', message => {
    const { data: { id, method, payload } } = message;
    // console.log(id, method, payload);
    // console.log(method);
    if (method === 'initialize') {
        handleInit(message);
    } else if (method === 'login') {
        handleLogin(payload);
    } else if (method === 'derive') {
        handleDerive(payload);
    }
});

/////////////////////////////////////////////



// const keyBtn = $(".pubkey-go").click(() => {
//     if (loggedInPubKey.length == 55) {
//         $(".pubkey-form").on("submit", (e) => {
//             e.preventDefault();
//             loggedInPubKey = $(".pubkey-input").val();
//             getDerivedKeys();
//         })
//     }
// });


async function getDerivedKeys() {
    $(".list-keys-for").text("Showing derived keys for " + loggedInPubKey);
    getDerivedEndpoint = BASE + "get-user-derived-keys";
    axios.post(getDerivedEndpoint, { "PublicKeyBase58Check": loggedInPubKey }).then((e) => {
        const keys = e.data.DerivedKeys;
        // console.log(keys);
        $(".key-count").html(`You have ${Object.keys(keys).length} Derived Keys`);
        $(".derived-key-list").empty();
        for (let key in keys) {
            // console.log(key);
            const validity = keys[key].IsValid ? "Valid Key" : "Invalid Key";
            $(".derived-key-list").append(`<div class="derived-key-item HAlign">
                <div>
                    <p>${key}</p>
                    <div class="HAlign">
                        <p>Expires at block ${keys[key].ExpirationBlock}</p>
                        <p>${validity}</p>
                    </div>
                </div>
                <button class="btn-red" onclick="deleteKey('${key}',${keys[key].ExpirationBlock})">delete</button>
                </div>`
            )
        }
        if (Object.keys(keys).length <= 0) {
            $(".derived-key-list").append(`<div class="derived-key-item HAlign">
                <p>No derived key found for this user</p>
                </div>`
            )
        }
    });
}

//////////// DELETE DKEY
function deleteKey(derivedPublicKey, expirationBlock) {
    endpoint = "/deleteDerivedKey"
    payload = {
        payload: {
            "OwnerPublicKeyBase58Check": loggedInPubKey,
            "DerivedPublicKeyBase58Check": derivedPublicKey,
            "ExpirationBlock": expirationBlock,
            "DeleteKey": true,
            "MinFeeRateNanosPerKB": 1000
        }
    }
    if (confirm("Are you sure you want to revoke access from this derived key?")) {
        axios.post(endpoint, payload).then((res) => {
            const TxnHex = res.data;
            console.log(TxnHex);
            approveTxn(TxnHex);
        })
    }
}


///////////// POPUP
var popup = $(".popup");

$(".close").click(() => {
    popup.hide()
})