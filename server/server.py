import datetime

import flask
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask import render_template
from datetime import timedelta

app = Flask(__name__, static_url_path='/static',static_folder='templates/static')
CORS(app)

@app.route("/")
def index():
    return render_template('/index.html')

@app.route("/testget")
def test_get():
    return {"message":"test get ok!"}

@app.route("/testCookie")
def tes_get():
    rsp_json = {"message": "test cookie ok!"}
    rsp = flask.make_response(jsonify(rsp_json), 200)
    rsp.set_cookie("cookie_from_sever", value="1", expires=tmr)
    return rsp

@app.route("/testpost", methods=["POST"])
def test_post():
    req = request.get_data()
    rsp = flask.make_response()
    rsp.data = request.get_data()
    # print(f"post params {req}")
    return rsp


if __name__ == '__main__':
    tmr = datetime.datetime.now() + timedelta(days=1)
    app.run(host='0.0.0.0', port=8000, use_reloader=False, threaded=True, debug=False)
