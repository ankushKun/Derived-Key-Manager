from flask import Flask, request
from flask.templating import render_template
import requests
from deso.Sign import Sign_Transaction

app = Flask(__name__)

BASE = "https://bitclout.com/api/v0/"


@app.route("/", methods=["GET"])
def home():
    return render_template("home.html")


@app.route("/newDerivedKey", methods=["POST"])
def newDerivedKey():
    data = request.get_json()
    derivedSeedHex = data["derivedSeedHex"]
    authorize_endpoint = BASE + "authorize-derived-key"
    payload = data["payload"]
    res = requests.post(authorize_endpoint, json=payload)
    TransactionHex = res.json()["TransactionHex"]
    SignedTransactionHex = Sign_Transaction(derivedSeedHex, TransactionHex)
    submit_endpoint = BASE + "submit-transaction"
    res = requests.post(
        submit_endpoint, json={"TransactionHex": SignedTransactionHex})
    return str(res.status_code)


@app.route("/deleteDerivedKey", methods=["POST"])
def deleteDerivedKey():
    data = request.get_json()
    authorize_endpoint = BASE + "authorize-derived-key"
    payload = data["payload"]
    res = requests.post(authorize_endpoint, json=payload)
    # print(res.json())
    TransactionHex = res.json()["TransactionHex"]
    return TransactionHex


@app.route("/submitTransaction", methods=["POST"])
def submit():
    data = request.get_json()
    signedTxnHex = data["transactionHex"]
    submit_endpoint = BASE + "submit-transaction"
    res = requests.post(
        submit_endpoint, json={"TransactionHex": signedTxnHex})
    return str(res.status_code)


# if __name__ == "__main__":
#    app.debug = False
#    app.run(host="0.0.0.0", port=5000)

app.run(port=3000, debug=True)
