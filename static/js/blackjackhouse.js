"use strict"
var socket = io.connect();
$(document).ready(function() {
	;(function(){
		resize();
		function resize() {//--------------Resize
			var width=document.body.clientWidth/1050;
			var height=document.documentElement.clientHeight/750;
			if(width<height){
				$('html').css({"font-size":""+(width)*100+"%"});
			}
			else{
				$('html').css({"font-size":""+(height)*100+"%"});
			}
		}
		window.onresize = resize;
	})();

	;(function() {//-----------------CHAT
		var chatAlertInterval;
		var chatElement=$(".control-panel-chat-hidePanel span");
		var messageField = $(".control-panel-chat-message");
		var username=$(".user-name").text();
		var currentPlace=$(".game-status-gametable").text();
			if(currentPlace==""){
				currentPlace="main";
			}

		chatElement.on("click",function(event){
		  $(".control-panel-chat-main").slideToggle("slow");
		});
		
		
		function subscribe(){
			var xhrsubscribe=new XMLHttpRequest();
			xhrsubscribe.timeout = 1000*60*60*6;
			xhrsubscribe.open("POST", "/chatSubscribe", true);
			xhrsubscribe.setRequestHeader('Content-Type', 'application/json');
			xhrsubscribe.send(JSON.stringify({from:currentPlace}));
			xhrsubscribe.onreadystatechange = function() {
				if (this.readyState != 4) {
					return;
				}
				if(xhrsubscribe.responseText){
					var reciveMessage=JSON.parse(xhrsubscribe.responseText);
					messageField.append("<div class='control-panel-chat-message-newpost'><span>"+reciveMessage.user+"</span>:"+reciveMessage.message+"</div>");
					messageAlert();
					messageField.stop().animate({
					  scrollTop: messageField[0].scrollHeight
					}, 800);
				}
				// subscribe();
			}
		}
		// subscribe();

		$("#publish").on("submit", function (event) {
			event.preventDefault();
			var messageInputField = $(this).find("[name=message]");
			var sendMessage=messageInputField.val();
			var xhrpublish=new XMLHttpRequest();
			xhrpublish.open("POST", "/chatPublish", true);
			xhrpublish.setRequestHeader('Content-Type', 'application/json');
			if(sendMessage[0]=="["){
				sendMessage=sendMessage.substr(1);
				xhrpublish.send(JSON.stringify({from:currentPlace,toUser:sendMessage.split("]")[0],message:sendMessage.split("]")[1]}));
				messageField.append("<div class='control-panel-chat-message-newpost'><span>"+username+"</span> to <span>"+sendMessage.split("]")[0]+"</span>:"+sendMessage.split("]")[1]+"</div>");
			}
			else{
				xhrpublish.send(JSON.stringify({from:currentPlace,toUser:"#all",message:sendMessage}));
			}
			messageInputField.val("");
		});

		function messageAlert() {
			if($("section.control-panel-chat-main").css("display")=="none"&&!chatAlertInterval){
				var flag = false;
				chatElement.css("color","red");
				chatElement.text("You have new message");
	    		chatAlertInterval=setInterval(function () {
	    			if(flag) {
	    				chatElement.css("color","red");
	    			}
	    			else {
	    				chatElement.css("color","white");
	    			}
	        		flag = !flag;
	    		}, 1000);
			};
		}

		chatElement.on("click",function() {
			if(chatAlertInterval){
				clearTimeout(chatAlertInterval);
				chatElement.css("color","#FFF8DC");
				chatElement.text("Chat");
			}
		});
	})();

	;(function(){//---------------------------------------registration
		var form=$("#regForm");

		var ajaxLoginCheck=function(reg){
			var loginField=form.find("input[name=Login]");
			$.ajax({
				url: "/register",
				method: "POST",
				contentType:"application/json; charset=utf-8",
				data: JSON.stringify({query:"checkLogin",username:loginField.val()}),
				dataType: "text",
			    success: function(response) {
			    	if(response=="true"){
			    		inputError(loginField, "Такой логин уже занят");	
			    	}
			    	else{
			    		if(reg==true){
			    			ajaxEmailCheck(true);
			    		}
			    	}
			    },
				error: function(response) {
					inputError(loginField, "Сбой соединения... попробуйте позже");
				}
			});
		}
		var ajaxEmailCheck=function(reg){
			var emailField=form.find("input[name=email]");
			$.ajax({
				url: "/register",
				method: "POST",
				contentType:"application/json; charset=utf-8",
				data: JSON.stringify({query:"checkEmail",email:emailField.val()}),
				dataType: "text",
			    success: function(response) {
			    	if(response=="true"){
			    		inputError(emailField, "Такой E-Mail уже зарегистрирован");	
			    	}
			    	else{
			    		if(reg==true){
			    			ajaxRegistration();
			    		}
			    	}
			    },
				error: function(response) {
					inputError(emailField, "Сбой соединения... попробуйте позже");
				}
			});
		}
		var ajaxRegistration=function(){
			$.ajax({
				url: "/register",
				method: "POST",
				contentType:"application/json; charset=utf-8",
				data: JSON.stringify({query:"registration",
									username:$("input[name=Login]").val(),
									email:$("input[name=email]").val(),
									password:$("input[name=Password]").val(),
									secret:$("input[name=secretWord]").val()}),
				dataType: "text",
			    success: function(response) {
			    	location.href = response;
			    },
				error: function(response) {
					console.log("error");
				}
			});
		}
		form.on("submit",function(event){
			event.preventDefault();
			$(this).find("input").each(function(){
				if($(this)+"[name=Login]"||$(this)+"[name=email]"){
					return;
				}
				else{
					switchFieldValidity($(this));
				}
			});
			if($("input.error").length<1){
				ajaxLoginCheck(true);
			};
		});
		form.find("input").on("blur", function(){
			switchFieldValidity($(this));
		});
		form.find("input").on("focus",function(){
			var currentField=$(this);
			if(currentField.attr("name")=="Password"){
				form.children().show("slow");
			}
			if(currentField.hasClass("error")){
				inputCorrect(currentField);
			}
		});
		function switchFieldValidity(currentField){
				switch(currentField.attr("name")){
					case "Login":checkLoginValidity(currentField);
						break;
					case "email":checkMailValidity(currentField);
						break;
					case "Password":checkPasswdValidity(currentField);
						break;
					case "confirmPassword":checkPasswdConfirmValidity(currentField,form.find("input[name=Password]"));
						break;
					case "secretWord":checkSecretWordValidity(currentField);
				}	
		}

		function checkLoginValidity(login){
			if (login.val().match(/^\w{1,}$/g)===null) {
				inputError(login, "Логин может содержать только буквы латинского алфавита (a–z), '_' и цифры");			
			}
			else if(login.val().match(/^.{4,16}$/g)===null){
				inputError(login, "Логин должен содержать от 4х до 16ти символов");
			}
			else if(!login.val().match(/^[A-z]/)){
				inputError(login, "Логин должен начинаться с буквы");
			}
			else{
				ajaxLoginCheck();
			}
		}
		function checkPasswdValidity(passwd){
			var currentVal=passwd.val();
			if ((currentVal.match(/[а-яa-z]{1,}/)===null)||(currentVal.match(/[А-ЯA-Z]{1,}/)===null)||(currentVal.match(/[0-9]{1,}/)===null)||(currentVal.match(/^.{4,16}$/g)===null)) {
				inputError(passwd,"Пароль должен содержать от 4х до 16ти символов в различном регистре и цифры");
			}
		}
		function checkPasswdConfirmValidity(passwd1,passwd2){
			if (passwd1.val()!=passwd2.val()) {
				inputError(passwd1,"Пароли не совпадают");
			}
		}
		function checkMailValidity(email){
			if (email.val().match(/^([a-z0-9_\.-])+@[a-z0-9-]+\.([a-z]{2,4}\.)?[a-z]{2,4}$/i)===null) {
				inputError(email,"Такой e-mail не допускается");
			}
			else{
				ajaxEmailCheck();
			}
		}
		function checkSecretWordValidity(secret){
			if (secret.val().match(/^\w{1,}$/g)===null) {
				inputError(secret,"Слово может содержать только буквы латинского алфавита (a–z), цифры и '_'");
			}
		}
		function inputError(field,errText){
			field.addClass("error");
			var inputSpan=field.prev().prev();
			inputSpan.addClass("error");
			inputSpan.val(inputSpan.text());
			inputSpan.text(errText);
		}
		function inputCorrect(field){
			field.removeClass("error");
			var inputSpan=field.prev().prev();
			inputSpan.removeClass("error");
			inputSpan.text(inputSpan.val());
			inputSpan.val("");
		}
	})();

	;(function(){//----------------------------signUp

		var form=$("#mainForm");

		function ajaxlogin(){
			var passField=form.find("input[name=Password]");
			var username=form.find("input[name=Login]").val();
			var remember=form.find("input[name=RememberMe]").prop('checked');
			$.ajax({
				url: "/signUp",
				method: "POST",
				contentType:"application/json; charset=utf-8",
				data: JSON.stringify({query:"signIn",username:username,password:passField.val(),remember_me:remember}),
				dataType: "text",
			    success: function(response) {
			    	if(response=="false"){
			    		inputError(passField, "Введен не верный пароль");
			    	}
			    	else{
			    		location.reload();
			    	}
			    },
				error: function(response) {
					inputError(passField, "Сбой соединения... попробуйте позже");
				}
			});
		}

		function ajaxLoginCheck(){
			var loginField=form.find("input[name=Login]");
			$.ajax({
				url: "/register",
				method: "POST",
				contentType:"application/json; charset=utf-8",
				data: JSON.stringify({query:"checkLogin",username:loginField.val()}),
				dataType: "text",
			    success: function(response) {
			    	if(response=="false"){
			    		inputError(loginField, "Такой логин не зарегистрирован");
			    	}
			    },
				error: function(response) {
					inputError(loginField, "Сбой соединения... попробуйте позже");
				}
			});
		}

		form.on("submit",function(event){
			event.preventDefault();
			ajaxlogin();
		});

		form.find("input[name=Login]").on("blur", function(){
			ajaxLoginCheck();
		});

		form.find("input").on("focus",function(){
			var currentField=$(this);
			if(currentField.hasClass("error")){
				inputCorrect(currentField);
			}
		});
		function inputError(field,errText){
			field.addClass("error");
			var inputSpan=field.prev().prev();
			inputSpan.addClass("error");
			inputSpan.val(inputSpan.text());
			inputSpan.text(errText);
		}
		function inputCorrect(field){
			field.removeClass("error");
			var inputSpan=field.prev().prev();
			inputSpan.removeClass("error");
			inputSpan.text(inputSpan.val());
			inputSpan.val("");
		}

	})();

	;(function(){//choose game sector
		$("#newTable").on("click", function(){
			var data={};
			data.minBet=5;
			data.maxBet=50;
			socket.emit('addNewTable',data);
		});
		socket.on('addNewTable', function(data){
		  location.reload();
		});
	})();



	;(function(){//----------------game-------------------------------------------------------
		//---------------------Join To Table------Recive info about players--------------------
		socket.on('tableInfo', function(players){
			for(var key in players) {
				var selectPlace=$("#player"+key+".place");
				if(players[key]!=null){
				    selectPlace.removeClass("empty").addClass("player");
				    selectPlace.find(".place-player-name").text(players[key]);
				    selectPlace.find(".chair").css({"background":"url(static/img/avatars/"+players[key]+".jpg) no-repeat","background-size":"100%"});
				}
				else{
					selectPlace.removeClass().addClass("place").addClass("empty").css({"border":"0.2rem solid rgba(0,0,0,0)"});
					selectPlace.find(".place-player-name").text("");
					selectPlace.find(".chair").css({'background':"url(../static/img/chair.jpg) no-repeat","background-size":"100%"});
					activateBetButton();
				}
			}
		});

		socket.on("betsStage", function(data){
			console.log(data);
			var playerLogin=$(".user-name").text();
			var playerBankField=$(".control-panel-playerBank");
			data.forEach(function(item,i,arr){
				if(item.login==playerLogin){
					playerBankField.find(".control-panel-playerBank-bank").text(item.bank);
				}
			});
			$(".place.player").each(function(){
				var place=$(this);
				if(place.find(".place-player-name").text()==playerLogin){
					place.addClass("betStage-wait");
					place.data("bet", 0);
				}
			});
			activateBetButton();	
		});
		//--------------------Bet button-----------------------------
		function activateBetButton(){
			if($(".place.player.betStage").length>0)
				return;
			var betStageWait=$(".place.player.betStage-wait");
	     	if(betStageWait.length<1)
	     	 	return;
	     	if($(".control-panel-playerBank-bank").text()<=0){
	     	   	socket.emit('standFromPlace',betStageWait.eq(0).attr("id").substr(6,1));
	     	   	return;
	     	}
			$(".betStage-wait").eq(0).removeClass("betStage-wait").addClass("betStage").css({"border":"0.2rem solid red"});
			var betStage=$(".place.player.betStage");
			showButton("bet");
			initChips();
			$(".control-panel-playerBank-bet").text(betStage.data("bet"));
			$(".control-panel-playerBank").fadeIn('slow');
			$(".control-panel-button-bet").on("click",function(event){
			  if(+betStage.data("bet")<=0){
					return;
			  }
			  socket.emit('betsDone',betStage.attr("id").substr(6,1));
			  $(".chips.onPlayer").unbind("click").fadeOut('slow', function(){
			    this.remove();
			  });
			  $(".control-panel-playerBank").fadeOut('slow');
			  betStage.css({"border":"0.2rem solid rgba(0,0,0,0)"});
			  betStage.removeClass("betStage");
			  hideButton($(this));	  
			  activateBetButton();
			});
		}

		socket.on('sendCard', function(data){
		  initCards(data.cardSuit,data.cardVal,data.player);
		});
		socket.on('openSecondDealerCard', function(data){
			var secondCard=$(".cards-playerdealer .13_13");
			secondCard.removeClass("13_13").addClass(data.cardSuit+"_"+data.cardVal).css({"background":"url(static/img/Cards/"+data.cardSuit+"_"+data.cardVal+".png) no-repeat","background-size":"100% 100%"});
		});

		socket.on('initTradeRound', function(data){
			data.forEach(function(item,i,arr){
				$("#player"+item).addClass("tradeStage-wait");
			});
			activateTradeButtons();
		});

		function activateTradeButtons() {
			var tradeStageWait=$(".place.player.tradeStage-wait");
	     	if(tradeStageWait.length==0)
	     	 	return;
 			tradeStageWait.eq(0).removeClass("tradeStage-wait").addClass("tradeStage").css({"border":"0.2rem solid red"});
			var place=$(".place.player.tradeStage");
			showButton("hit");
			$(".control-panel-button-hit").on("click",function(event){
				place.css({"border":"0.2rem solid rgba(0,0,0,0)"});
				place.removeClass("tradeStage");
			    hideButton($(".control-panel-button-hit"));
			    hideButton($(".control-panel-button-stand"));
			    hideButton($(".control-panel-button-x2"));
			    socket.emit('hit',place.attr("id").substr(6,1));
			    activateTradeButtons();
			});
			showButton("stand");
			$(".control-panel-button-stand").on("click",function(event){
				place.css({"border":"0.2rem solid rgba(0,0,0,0)"});
				place.removeClass("tradeStage");
			    hideButton($(".control-panel-button-stand"));
			    hideButton($(".control-panel-button-hit"));
			    hideButton($(".control-panel-button-x2"));
			    socket.emit('stand',place.attr("id").substr(6,1));
			    activateTradeButtons();
			});
			showButton("x2");
			$(".control-panel-button-x2").mouseover(function() {
				$(".control-panel-playerBank").stop().fadeIn("fast");
			}).mouseout(function() {
    		$(".control-panel-playerBank").stop().fadeOut("fast");
  			});
		}


			



		
		socket.on('initX2Button', function(data){
			showButton("x2");
			
			// $(".control-panel-button-x2").on("click",function(event){
			// 	var place=$(".place.player.tradeStage");
			// 	place.css({"border":"0.2rem solid rgba(0,0,0,0)"});
			// 	place.removeClass("tradeStage");
			//     hideButton($(this));
			//     hideButton($(".control-panel-button-hit"));
			//     hideButton($(".control-panel-button-stand"));
			//     socket.emit('x2',place.attr("id").slice(-1));
			// });
		});

		socket.on('destroyCards', function(){
			//--------------------Destroy CARDS----------------------------------
			hideButton($(".control-panel-button-bet"));
			hideButton($(".control-panel-button-hit"));
			hideButton($(".control-panel-button-x2"));
			hideButton($(".control-panel-button-stand"));
			$(".control-panel-playerBank").fadeOut("fast");
			$(".chips.onPlayer").fadeOut("fast");
			$(".place.player").each(function(){
				$(this).css({"border":"0.2rem solid rgba(0,0,0,0)"});
			});
			var gameCards=$(".game-field-cards-card");
			gameCards.animate({"top":"25rem","left":"25rem"},"slow",function(){gameCards.fadeOut('fast',function(){gameCards.remove()})});
		});

		//--------------------STAND----------------------------
		$(".control-panel-button-stand").on("click",function(event){         
		    
		});
		//--------------------clict on place----------------------
		$(".place").on("click",function(event){
		  var place=$(this);
		  if(place.hasClass("empty")){
		//--------------------SIT ON Place-------------------------
		    socket.emit('sitOnPlace',place.attr("id").substr(6,1));
		  }
		  else if(place.find(".place-player-name").text()==$(".user-name").text()){
		//--------------------Stand from the place-------------------------
			socket.emit('standFromPlace',place.attr("id").substr(6,1));
		  }
		  else{
		//--------------------PLAYER INFO-------------------------  
			$(".player-info").remove();
			$(".control-panel").prepend("<div class='player-info'>Bank:<span class='player-info-bank'>1000</span> win:<span class='player-info-win'>50%</span></br>register:<span class='player-info-win'>10.12.15</span><br></div>");
		  }
		});
		
		// $(".place").on("mouseenter",(function(){}));

		//--------------------INIT CARD----------------------------------
		function initCards(suit,rank,player){
		  var playerCardField=$(".game-field-cards").find(".cards-player"+player);
		  var baseFountSize=parseInt($("html").css("font-size"));
		  // var x=(playerCardField.position().left-fieldCards.position().left)/baseFountSize;
		  var newCard=createCard(suit,rank,player);
		  playerCardField.append(newCard);
		  animateCardToPlayer(newCard,playerCardField,player);
		  function createCard(suit,rank,player){
		    switch(player){
		      case "dealer": var x=50; var y=0;
		      	break;
		      case 0: var x=-10; var y=-2;
		        break;
		      case 1: var x=-10; var y=-43;
		        break;
		      case 2: var x=-20; var y=-3;
		        break;
		      case 3: var x=-20; var y=-43;
		        break;
		      case 4: var x=-26; var y=-20;
		        break;
		    }
		    return $("<div class='game-field-cards-card "+suit+"_"+rank+"' style='top:"+x+"rem;left:"+y+"rem;background:url(static/img/Cards/"+suit+"_"+rank+".png) no-repeat;background-size:100% 100%;'></div>");
		  }
		  function animateCardToPlayer(newCard,playerCardField,player){
		    var countCards=playerCardField.find("div").length-1;
		    var y=countCards*4.3;
		      if(player==1||player==3){
		        y*=-1;
		      }
		    newCard.animate({"top":"0rem","left":""+y+"rem"},"slow");
		  }
		  

		}
		//--------------------END INIT CAR-------------------------------

		//--------------------END Destroy CAR-------------------------------

		//--------------------Return Chips----------------------------------
		function returnChips(player){
		  var chips=$(".chips.inBank");
		  switch(player){
		    case 0:returnToPlayer0();break;
		    case 1:returnToPlayer1();break;
		    case 2:returnToPlayer2();break;
		    case 3:returnToPlayer3();break;
		    case 4:returnToPlayer4();break;
		  }
		  function returnToPlayer0() {
		    chips.animate({"bottom":"-4rem","left":"24.25rem"},"slow",function(){chips.fadeOut('fast',function(){chips.remove()})});
		  }
		  function returnToPlayer1() {
		    chips.animate({"bottom":"15rem","left":"-5rem"},"slow",function(){chips.fadeOut('fast',function(){chips.remove()})});
		  }
		  function returnToPlayer2() {
		    chips.animate({"bottom":"7rem","left":"-5rem"},"slow",function(){chips.fadeOut('fast',function(){chips.remove()})});
		  }
		  function returnToPlayer3() {
		    chips.animate({"bottom":"15rem","left":"55rem"},"slow",function(){chips.fadeOut('fast',function(){chips.remove()})});
		  }
		  function returnToPlayer4() {
		    chips.animate({"bottom":"7rem","left":"55rem"},"slow",function(){chips.fadeOut('fast',function(){chips.remove()})});
		  }
		}
		//--------------------End Return Chips----------------------------------

		//--------------------Show BUTTONS--------------------------------
		function showButton(buttonName){
		  $(".control-panel-button-"+buttonName).fadeIn('slow').removeClass("hide");
		}
		//--------------------END Show BUTTONS--------------------------------

		//--------------------Hide BUTTONS--------------------------------
		function hideButton(buttonName){
		  buttonName.off("click").fadeOut('slow');
		}
		//--------------------END Hide BUTTONS--------------------------------

		//--------------------INIT CHIPS----------------------------------
		function initChips(){
		  var currentPlayerBank=$(".control-panel-playerBank-bank").text();
		  var chipSection=$(".game-field-chips");

		  initChip(5,33,-16);
		  initChip(25,36.7,-16);
		  initChip(50,40.4,-16);
		  initChip(100,44.1,-16);
		  initChip(500,47.8,-16);
		  initChip(1000,51.6,-16);

		  function initChip(chipValue,leftPos,bottomPos){
		    if(chipValue<=currentPlayerBank){
		      var newChip=createChip(chipValue,leftPos,bottomPos);
		      chipSection.append(newChip);

		      function createChip(chipValue,leftPos,bottomPos){
		        return $("<article class='chips chip"+chipValue+" onPlayer hide' data-chipcost='"+chipValue+"' style='left:"+leftPos+"rem;bottom:"+bottomPos+"rem;'></article>");
		      }

		      newChip.fadeIn('slow').removeClass("hide").on("click",function(event){
		        var currentChip=$(this);
		        var currentBetStage=$(".place.player.betStage");
		        var playerBetField=$(".control-panel-playerBank-bet");
		        var chipClass=currentChip.attr("class");
		        var chipcost=currentChip.data("chipcost");
		        var currentBankField=$(".control-panel-playerBank-bank");
		        currentBankField.text(+currentBankField.text()-chipcost);
		        currentBetStage.data("bet",+currentBetStage.data("bet")+chipcost);
		        playerBetField.text(+currentBetStage.data("bet"));

		        $(".chips.onPlayer").each(function(){
		        	if($(this).data("chipcost")>currentBankField.text())
		        		$(this).off("click").fadeOut("slow");
		        });
		        socket.emit('chipToBank',{place:$(".place.player.betStage").attr("id").slice(-1),chipcost:chipcost});   

		        function randomShift(koefShift){
		          var rndSift=+Math.random();
		          if(Math.ceil(rndSift*100)%2){
		            rndSift*=-koefShift;
		          }
		          else{rndSift*=koefShift;}
		          return rndSift;
		        }

		        var bottomShift=25+randomShift(3);
		        var leftShift=randomShift(4);
		        var chipPosition=currentChip.css("left");
		        leftShift+=24.5-(+chipPosition.slice(0,-2)/+$('html').css('font-size').slice(0,-2));
		        var currentChipCost=currentChip.data("chipcost");
		        if(currentPlayerBank-currentChipCost<currentChipCost){
		          currentChip.unbind("click").appendTo(".game-field-chips").removeClass("onPlayer").addClass("inBank").animate({"left":"+="+leftShift+"rem","bottom":"+="+bottomShift+"rem"},"slow");
		        }
		        else{
		          currentChip.clone().appendTo(".game-field-chips").removeClass("onPlayer").addClass("inBank").animate({"left":"+="+leftShift+"rem","bottom":"+="+bottomShift+"rem"},"slow");
		        }
		      });

		    }
		  }

		}
	})();

});