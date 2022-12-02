//const host = "http://172.20.10.2:8000/"
//const host = "http://192.168.0.100:8000/"
//const host = 'http://192.168.33.39:8000/';

var host = ''
if (document.domain.includes('package')){
	host = 'http://192.168.33.50:8000/'
}


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

// function setCookie1() {
// 	var d = new Date();
// 	d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000);
// 	let string = 'cookie2=哈喽;' + 'expires=' + d.toGMTString() + '; ';
// 	console.log(string)
// 	document.cookie = string
// }

function getAllCookie() {
	var cookies = document.cookie.split(';');
	for (var i = 0; i < cookies.length; i++) {
		console.log(cookies[i]);
	}
}

$(document).ready(function() {
	testAjax();
	setCookie();
	$("#request").html('ajax请求地址: ' + host)
});
