var sendEmailToMe = require('./src/sendemail');
var https = require('https');
var superagent = require('superagent');
var fs = require('fs');
var path = require('path');
var http = require('http');
var querystring = require('querystring');
var parseString = require('xml2js').parseString;

//------模拟登陆
//--解析cookie
var parseCookie = function (cook){
	return(cook.slice(50,62));	
}
var parseCookie2 = function (cook){
	return(cook.slice(12,15));	
}
function parseCookie3(str){
		var arr1 = str.split('=');
		var arr2 = arr1[1].split('"');
		return arr2;
	}
function parseCookie4(str){
	var arr = str.split('<br/>');
	return arr[1];
}
function checkIn(){
	return new Promise((resolve,reject)=>{
		//-----创建时间戳
		var nowtime= new Date();
		var timeStamp = nowtime.getTime();
		superagent.get('https://login.wx.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=zh_CN&_='+timeStamp)
		.end(function(error,res){
			if (res.ok) {
				const uuid = parseCookie(res.text);
				var obj = {uuid:uuid,timeStamp:timeStamp};    			
				resolve(obj);
			} else {
				console.log(error);
				reject();
			}
		});
	})
}
//----向邮箱发送图片
function sendMymail(obj){
	return new Promise((resolve,reject)=>{
		sendEmailToMe(obj.uuid);//这个待会解开注释
		console.log('模拟已发送邮件');
		resolve(obj);//将参数传递下去
	})
}

//----向服务器发送get请求包
function sendGetPackage(obj){
	return new Promise((resolve,reject)=>{
		var str = "https://login.wx.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid="+obj.uuid+"&tip=1&r=-2138469360&_="+obj.timeStamp;
		let timer = setInterval(function(){
			superagent.get(str)
			.end((error,res)=>{
				if(res){					
					if(parseCookie2(res.text)=='200'){
						//-获取要重定向的地址
						var reg = /\"(.*?)\"/;
						// console.log(reg.exec(res.text)[1]);
						// console.log(reg.exec(res.text)[1]);
						clearInterval(timer);
						resolve(reg.exec(res.text)[1]);
					}

				}
				else{
					reject();
					console.error('发送get包出现错误。');
				}
			})
		}, 4000);
	});	
}

//-------跳转页面
//-------这里拿到cookie,这条连接里是设置cookie的，
//通过res.headers['set-cookie']可以获取服务器传过来的cookie
function changeWeb(urlStr){
	return new Promise((resolve,reject)=>{
		superagent.get(urlStr+'&fun=new')
		// superagent.get(urlStr)
		.end((error,res)=>{
			if(res){
				// console.log(res.text);
				var obj = {};
				parseString(res.text,{ explicitArray : false, ignoreAttrs : true }, function (err, result) {
				  		    // console.dir(JSON.stringify(result));
				  		    obj = result.error;
				  		});
					obj.setCookie = res.headers['set-cookie'];
				  		// console.log(obj);
				  		//这个obj就是我们得到来自服务器的返回的信息。
				  		resolve(obj);
				  	}
				  	else{
				  		console.log(error);
				  		reject();
				  	}
				  })
	})
}

//--------微信初始化
function initWechat(obj){
	return new Promise((resolve,reject)=>{
		superagent.post(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=-${new Date().getTime()}&lang=zh_CN&pass_ticket=${obj['pass_ticket']}`)
		.set("Content-Type","application/json; charset=UTF-8")
		.set('cookie',obj.setCookie)
		.send(
			{"BaseRequest":{
				"Uin":obj.wxuin,
				"Sid":obj.wxsid,
				"Skey":obj.skey,
				"DeviceID":"e585408158045787"
			}
		})
		.end((error,res)=>{
			if(res){				
				obj.weixin = JSON.parse(res.text);
				obj.mySelfName = obj.weixin.User.UserName;
				resolve(obj);
			}
			else{
				console.log(error);
				reject();
			}
		})
	})
}
//-----开启微信状态通知

function weixinStatus(obj){
	
	return new Promise((resolve,reject)=>{		
		superagent.post(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxstatusnotify?lang=zh_CN`)
				  .set('Content-Type','application/json; charset=UTF-8')
				  .set('cookie',obj.setCookie)
				  .send({
				  	"BaseRequest":{
				  		"Uin":obj.wxuin,
				  		"Sid":obj.wxsid,
				  		"Skey":obj.weixin.SKey,
				  		"DeviceID":"e585408158045787"
				  	},
				  	"Code":3,
				  	"FromUserName": obj.weixin.User.UserName,
				  	"ToUserName": obj.weixin.User.UserName,
				  	"ClientMsgId": new Date().getTime()

				  })
				  .end((error,res)=>{
				  	if(res){
				  		// console.log(res.text);
				  		resolve(obj);
				  	}
				  	else{
				  		console.log(error);
				  		reject();
				  	}
				  })
				})
}




//----心跳包，与服务器同步并获取状态
function weixinHeart(obj){
	return new Promise((resolve,reject)=>{
		obj.friendMsg = [];
		obj.friendMsg[2]=0;
		var ssky = obj.weixin.SyncKey.List;
		var str = [];
		ssky.forEach(function(ele,i){
			str.push(ele.Key+'_'+ele.Val);
		});
		var syStr = str.join('|');
		obj.newssk = syStr;
		

		function heart(){
			var timer = setInterval(()=>{
			superagent.get(`https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck?r=${new Date().getTime()}&skey=${obj.weixin.SKey}&sid=${obj.wxsid}&uin=${obj.wxuin}&deviceid=e585408158045787&synckey=${obj.newssk}&_=${new Date().getTime()}`)
			.set('Cookie',obj.setCookie)
			.end((error,res)=>{
				if(res){
						var arr1 = parseCookie3(res.text);
						// console.log(arr1);------检测心跳包
							if(arr1[3] == '2' || arr1[3] == '3'){
								//当selector为2的时候，向发服务器发送请求，获取最新消息
								//这里不用clearInterval这个定时器，就让他实时刷新，每个定时器的
								//结果自己对自己负责。
								superagent.post(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?sid=${obj.wxsid}&skey=${obj.weixin.SKey}`)
								.set('Cookie',obj.setCookie)
								.send(
										{
											"BaseRequest" : {
												"Uin":obj.wxuin,
												"Sid":obj.wxsid,
												"Skey":obj.weixin.SKey,
												"DeviceID":"e585408158045787"
											},
											"SyncKey" : obj.weixin.SyncKey,
											"rr" :new Date().getTime()
										}
									)
								.end((error,res)=>{
									var accept = res.text;
									var obj_acc = JSON.parse(accept);
									//------新的sync
									var newSync = obj_acc.SyncCheckKey.List;
									var str2 = [];
									newSync.forEach(function(ele,i){
										str2.push(ele.Key+'_'+ele.Val);
									});
									var syStr2 = str2.join('|');
									obj.newssk = syStr2;
									//-----上面是新的sync
									//---我们还得定义一个空数组用来记录最新的联系人。
									var newMsg = '';
									var newFriend = '';
									var newFriendLen = 0;
									//obj.friendMsg[2]：记录上一个的obj_acc.AddMsgList没有我信息的长度
									//newFriendLen：记录当前的obj_acc.AddMsgList没有我的信息的长度
									//只要当前的长度大于
									
									//--------这一步只是更新系统联系人
									obj_acc.AddMsgList.forEach((ele,index)=>{
										// console.log('消息来自：'+ele.FromUserName);
										// console.log('收到的消息有：'+ele.Content);
										if(ele.MsgType == 1 && ele.FromUserName != obj.mySelfName){	
												newFriendLen++;
												console.log(newFriend);
												newFriend = ele.FromUserName;
												//判断消息来自群聊还是个人
												if(ele.FromUserName[1] == '@'){
													console.log('这个消息来自群聊');
														newMsg = parseCookie4(ele.Content);
												}
												else{
													console.log('这个消息来自个人');
													newMsg = ele.Content;
												}
															
										}
									})
									
									obj.friendMsg[0]=newFriend;
									obj.friendMsg[1]=newMsg;
									console.log(obj.friendMsg);
									//-----转入图灵机，并且执行回复消息。
									if(newFriendLen > obj.friendMsg[2]){
										clearInterval(timer);
										tulingPost(obj,heart);
										obj.friendMsg[2] = newFriendLen;
									}
									else{
										console.log('这是重复消息，不进入图灵机。')
									}
									
									// fs.writeFileSync('./accept.json',accept);
								})
								
							}
					  		resolve(obj);
					  	}
					  	else{
					  		console.log(error);
					  	}
					  })
		},10000);
		}

		heart();
	})
}
//------图灵机
 function tulingPost(obj,cal){
 	console.log('进入图灵机');
  var options = {
    'hostname':'www.tuling123.com',
    'port':'80',
    'method':'POST',
    'path':'/openapi/api',
    'header':{
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
     }
    }
  options.path = options.path+'?'+querystring.stringify({'key':'5f18466709d248ff83fce6e1f0eb3c99','info':obj.friendMsg[1],'userid':'1111111'});
  var wodeReq = http.request(options,function(response){
    var tuhui = '';
    response.on('data',function(chunk){
      tuhui += chunk;

    });
    
    response.on('end',function(){
      var tuhuiObj = JSON.parse(tuhui);
      obj.resMsg = tuhuiObj.text;
      console.log(obj.resMsg);
      //-------将信息发送给手机
      sendMsgToMobile(obj);
      
    })
  })
  wodeReq.end();
  cal();
}

//---发消息给手机
function sendMsgToMobile(obj){
	return new Promise((resolve,reject)=>{
		superagent.post('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg')
		.set('Content-Type','application/json; charset=UTF-8')
	    .set('cookie',obj.setCookie)
	    .send({	    		
				"BaseRequest" : {
					"Uin":obj.wxuin,
					"Sid":obj.wxsid,
					"Skey":obj.weixin.SKey,
					"DeviceID":"e585408158045787"
				},
				"Msg": {
				    "Type": 1,
				    "Content": obj.resMsg,
				    "FromUserName":obj.mySelfName,
				    "ToUserName": obj.friendMsg[0],
				    "LocalID": new Date().getTime(),
				    "ClientMsgId": new Date().getTime()
				}
	    })
	    .end((error,res)=>{
	    	if(res.ok){
	    		console.log('已发送消息给手机');
	    	}
	    	else{
	    		console.log(error);
	    	}
	    })
	})
}
checkIn().then((obj)=>{return sendMymail(obj);})
		 .then((obj)=>{return sendGetPackage(obj);})
		 .then((urlStr)=>{return changeWeb(urlStr);})
		 .then((obj)=>{return initWechat(obj);})
		 .then((obj)=>{return weixinStatus(obj);})
		 .then((obj)=>{return weixinHeart(obj);})  
		 //----接下来，就是再心跳这里面轮询，只要selector=2,就获取最新消息，找到发消息的人的
		 //username和nickname，符合条件的，就将这个消息转给图灵机，然后把图灵机返回来的消息再
		 //发给执行发消息的的请求
		 //
		 //过程：
		 //			心跳轮询有没有新消息-->有-->判断这个消息来自谁，停止轮询，符合条件，图灵回复
		 //								-->没有-->继续轮询