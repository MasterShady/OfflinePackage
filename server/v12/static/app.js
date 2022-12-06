//const host = "http://172.20.10.2:8000/"
//const host = "http://192.168.0.100:8000/"
//const host = 'http://192.168.33.39:8000/';

var host = 'http://127.0.0.1:8000/'
function testAjax() {
	$.ajax({
		type: 'GET',
		url:  host + 'testget',
		success: function(response) {
			$('#p1').html(JSON.stringify(response));
			console.log('get resutl: ' + JSON.stringify(response));
		},
		error: function(error) {
			console.log('error');
		}
	});

	$.ajax({
		type: 'POST',
		url: host + 'testpost',
		data: JSON.stringify({ param1: 'value1' }),
		dataType: 'json',
		contentType: 'application/json',
		success: function(response) {
			console.log(JSON.stringify(response));
			$('#p2').html('post result: ' + JSON.stringify(response));
		}
	});
}

function testServerCookie(){
	$.ajax({
		type: 'GET',
		url:  host + 'testCookie',
		dataType: "json",
		success: function(response) {
			$('#ck').html(response['message']);
		},
		error: function(error) {
			console.log('error');
		}
	});

}

function setCookie() {
	var d = new Date();
	d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000);
	document.cookie = 'cookie_from_js=1; ' + 'expires=' + d.toGMTString() + '; ';
}


function getAllCookie() {
	var cookies = document.cookie.split(';');
	for (var i = 0; i < cookies.length; i++) {
		console.log(cookies[i]);
	}
}

function dataURItoBlob(base64Data) {

	//console.log(base64Data);//data:image/png;base64,
	//let byteString = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
	let byteCharacters = atob(base64Data);
	// if(base64Data.split(',')[0].indexOf('base64') >= 0)
	// 	byteString = atob(base64Data.split(',')[1]);//base64 解码
	// else{
	// 	byteString = unescape(base64Data.split(',')[1]);
	// }
	// var mimeString =
		//base64Data.split(',')[0].split(':')[1].split(';')[0];//mime类型 -- image/png

	// var arrayBuffer = new ArrayBuffer(byteString.length); //创建缓冲数组
	// var ia = new Uint8Array(arrayBuffer);//创建视图
	var ia = new Uint8Array(byteCharacters.length);//创建视图
	for(var i = 0; i < byteCharacters.length; i++) {
		ia[i] = byteCharacters.charCodeAt(i);
	}
	var blob = new Blob([ia], {
		type: 'image/png'
	});
	return blob;
}

function getImage(){
	if (window.KKJSBridge != null){
		window.KKJSBridge.call('EvnModule','getImage', {}, function(res){
			let base64data = res.imageData;
			let blobData = dataURItoBlob(base64data);
			let urlCreator = window.URL || window.webkitURL;
			let imageUrl = urlCreator.createObjectURL(blobData);
			$('#image').attr('src',imageUrl);
		})
	}else {
		let blobData = dataURItoBlob("");
		let urlCreator = window.URL || window.webkitURL;
		let imageUrl = urlCreator.createObjectURL(blobData);
		$('#image').attr('src',imageUrl);
	}

}


$(document).ready(function() {
	if (window.KKJSBridge != null){
		window.KKJSBridge.call('EvnModule', 'getRequestHost', {}, function(res) {
			host = "http://" + res.host + "/"
			testAjax();
			setCookie();
			$("#request").html('ajax请求地址: ' + host)
		});
	}else {
		testAjax();
		setCookie();
		$("#request").html('ajax请求地址: ' + host)
	}
});
