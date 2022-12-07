import datetime
import os

import flask
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask import render_template
from datetime import timedelta
from flask import url_for, redirect

app = Flask(__name__, static_url_path='/static', static_folder='templates/static')
CORS(app)

PACKAGEINFO = {
    "app":{
        "version":"3",
        "path":"http:127.0.0.1:8000/download/app.zip"
    },
    "app2":{
        "version":"1",
        "path":"/download/app.zip"
    }
}


@app.route('/getNewestPackage',methods=["POST"])
def getPackage():
    req = request.get_json()
    packageId = req['packageId']
    rsp = PACKAGEINFO[packageId]
    return rsp

@app.route("/redirct")
def redirct():
    return redirect(url_for('index'), 302)

@app.route("/")
def index():
    print("get cookie from server!")
    print(request.cookies)
    return render_template('/index.html')

@app.route("/page2")
def page2():
    print(f"request.cookies: {request.cookies}")
    return render_template('/page2.html')

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

@app.errorhandler(Exception)
def handle_exception(err):
    print(err)


@app.route("/download/<filename>", methods=['GET'])
def download_file(filename):
    # 需要知道2个参数, 第1个参数是本地目录的path, 第2个参数是文件名(带扩展名)
    directory = os.getcwd()  # 假设在当前目录
    return send_from_directory("packages", filename, as_attachment=True)


# #设置允许的文件格式
# ALLOWED_EXTENSIONS = set(['png', 'jpg', 'JPG', 'PNG', 'bmp'])
#
# def allowed_file(filename):
#     return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


# 设置静态文件缓存过期时间
# app.send_file_max_age_default = timedelta(seconds=1)

# @app.route('/upload', methods=['POST'])
# def upload():
#     f = request.files['file']
#     if not (f and allowed_file(f.filename)):
#         return jsonify({"error": 1001, "msg": "请检查上传的图片类型，仅限于png、PNG、jpg、JPG、bmp"})
#     user_input = request.form.get("name")
#     basepath = os.path.dirname(__file__)  # 当前文件所在路径
#     upload_path = os.path.join(basepath, 'static/images', secure_filename(f.filename))  #注意：没有的文件夹一定要先创建，不然会提示没有该路径
#     f.save(upload_path)
#     rsp_json = {"message": "upload image!"}
#     rsp = flask.make_response(jsonify(rsp_json), 200)
#     return rsp

if __name__ == '__main__':
    tmr = datetime.datetime.now() + timedelta(days=1)
    app.run(host='0.0.0.0', port=8000, use_reloader=False, threaded=True, debug=True)
