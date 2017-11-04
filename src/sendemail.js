var nodemailer = require('nodemailer'); 

function sendEmailToMe(data){
	var transporter = nodemailer.createTransport({  
		service: 'qq',  
		auth: {  
			user: '2388540124@qq.com',  
   		    pass: 'lrcctfqmdleddich' //授权码,通过QQ获取  

}  
});  
	
	var mailOptions = {  
		    from: '2388540124@qq.com', // 发送者  
		    to: 'woaimixifan@163.com', // 接受者,可以同时发送多个,以逗号隔开  
		    subject: '送给自己的背包', // 标题  
		    //text: 'Hello world', // 文本  
		    html: '<img src="https://login.weixin.qq.com/qrcode/'+data+'">' 
		    // html: '<img src="https://login.weixin.qq.com/qrcode/oeezN5Fsqg==">' 
		    // html:'<img style="-webkit-user-select: none;background-position: 0px 0px, 10px 10px;background-size: 20px 20px;background-image:linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee 100%),linear-gradient(45deg, #eee 25%, white 25%, white 75%, #eee 75%, #eee 100%);cursor: zoom-in;" src="http://login.weixin.qq.com/qrcode/'+data+'" width="192" height="192">'  
		};  

transporter.sendMail(mailOptions, function (err, info) {  
	if (err) {  
		console.log(err);  
		return;  
	}  

	console.log('发送成功');  
}); 
} 

/*boom=()=>{
	console.log('wocaonima');
}*/
module.exports=sendEmailToMe;
// module.exports=boom;