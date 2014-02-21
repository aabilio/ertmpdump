WEB_SOCKET_SWF_LOCATION = "/static/WebSocketMain.swf";
WEB_SOCKET_DEBUG = true;


var ertmpd = angular.module('ertmpd', ['gettext'])

.config(function ($compileProvider){
  // Needed for routing to work
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);

  /* Restart browser every 'min' minutes */ min = 1;
  window.setTimeout(
  	function() {
  		$.ajax("/keepalive").success(function() { // Keep Alive? 
  			window.location.href = window.location.href;
  		}).fail(function(){
  			$(modalInfoNotKeepAlive).modal();
  		});
  	}, 
  	min*60*1000
  );
})
.run(function (gettextCatalog, Utils) {
	//gettextCatalog.debug = true;
	gettextCatalog.currentLanguage = Utils.getPrefLanguage(); // 'es' else 'en'
})

.factory('Socketio', function () {
	var socket = io.connect();

	$(window).bind("beforeunload", function() {
	  socket.disconnect();
	});
	socket.on('connect', function () {  });
	socket.on('reconnect', function () {  });
	socket.on('reconnecting', function () {  });
	socket.on('error', function (e) { msg = e ? e : gettext('A unknown error occurred') ; alert(msg);});

	return socket;
})
.factory('Utils', function () {

	var getPrefLanguage = function () {
		//actual_translations = ['en', 'es_ES'];
		lang = window.navigator.userLanguage || window.navigator.language;
		return lang.indexOf("es") != -1 ? 'es_ES' : 'en';
	};
	var humanReadTimeRemaining = function(seconds) {
		var d=Math.floor((seconds%31536000)/86400);d=(d<10)?"0"+d:d;
		var h=Math.floor(((seconds%31536000)%86400)/3600);h=(h<10)?"0"+h:h;
		var m=Math.floor((((seconds%31536000)%86400)%3600)/60);m=(m<10)?"0"+m:m;
		var s=(((seconds%31536000)%86400)%3600)%60;s=Math.ceil(s);s=(s<10)?"0"+s:s;
		return(d>0)?d+"d "+h+"h "+m+"m "+s+"s":h+"h "+m+"m "+s+"s"; // return "[00d] 00h 00m 00s"
	};
	var currentTimestamp = function () {
		return (!Date.now) ? new Date().getTime() : Date.now();
	};
	var diffInSecs = function(one_time, another) { // actually, in miliseconds
		timeDiff = Math.abs(one_time - another);
		//diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
		return timeDiff;
	};
	var urlAndPath = function() {
		return document.URL.split("?")[0]; // return "http://localhost[...]easy-rtmpdump.hml$"
	};
	var get_query = function() {
		tmp = URI(document.URL).query(true);
		return $.isEmptyObject(tmp) ? null : tmp;
	};
	var close_browser_tab = function() {
		open(location, '_self').close(); // hack. ¿works on all browers?
	};
	var random_id = function() {
	  var text = "";
	  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	  for( var i=0; i < 7; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	};
	return {
		closeBrowserTab: close_browser_tab,
		randomID: random_id,
		getQuery: get_query,
		urlAndPath: urlAndPath,
		currentTimestamp: currentTimestamp,
		diffInSecs: diffInSecs,
		humanReadTimeRemaining: humanReadTimeRemaining,
		getPrefLanguage: getPrefLanguage
	};
})

.factory('Backend', function ($q, $http, Socketio, Utils) {

	function makeid() {
		return Utils.randomID();
	}
	function toBackend(type, msg) {
		Socketio.emit(type, { msg: msg });
	}
	function commandToBackend(type, command, _id, orig) {
		Socketio.emit(type, { command: command, _id: _id, orig: orig });
	}
	function sendChooseDirSignal() {
		toBackend("choose_dir", makeid());
	}
	function sendGetPrefDir() {
		toBackend("pref_dir", makeid());
	}
	function sendExitSignal() {
		toBackend("exit_signal", "null");
	}
	function sendCommandToBackend(command, _id, orig) {
		commandToBackend("command", command, _id, orig);
	}
	function sendCancelDownload(_id) {
		toBackend("cancel_download", _id)
	}

	var close_and_exit = function() {
		sendExitSignal();
	}
	var choose_dir = function() {
		sendChooseDirSignal();
	}
	var get_command = function() {
		var deferred = $q.defer();
		Socketio.on('rtmpdump_command_to_web', function (command) {
		  deferred.resolve(command);
		});
		return deferred.promise;
	}
	var get_dirpath = function () {
    var deferred = $q.defer();
    sendGetPrefDir();
    Socketio.on('dir_to_web', function (dirpath) {
    	deferred.resolve(dirpath);
		});
    return deferred.promise;
  };

  var get_general_msg = function() {
  	var deferred = $q.defer();
    Socketio.on('msg_to_web', function (msg) {
    	deferred.resolve(msg);
		});
    return deferred.promise;
  }

  var start_download = function(command, _id, orig) {
  	sendCommandToBackend(command, _id, orig);
  }

  var cancel_download = function(_id) {
  	sendCancelDownload(_id);
  }

  var get_socket = function() {
  	return Socketio;
  }

  return {
  	getCommand: get_command,
  	getDirpath: get_dirpath,
  	getGeneralMsg: get_general_msg,
  	launchChooseDir: choose_dir,
  	closeAndExit: close_and_exit,
  	startDownload: start_download,
  	socket: Socketio,
  	id: Utils.randomID(),
  	cancelDownload: cancel_download
  };

})

.factory('Download', function () {
	return []
})

.factory('Persistence', function () { // TODO: Add support for IE here!
	// Persistence based on localStorage

	var json2obj = function(json) {
		return JSON.parse(json);
	}
	var obj2json = function(obj) {
		return JSON.stringify(obj);
	}
	var set = function(key,obj) {
		localStorage[key] = obj2json(obj);
	}
	var get = function(key) {
		return json2obj(localStorage[key])
	}
	var clear_all = function() {
		localStorage.clear();
	}
	var has_key = function(key) {
		return localStorage.hasOwnProperty(key);
	}

	return {
		set: set,
		get: get,
		clearAll: clear_all,
		has_key: has_key
	};

})

.controller('EasyRTMPDUMOController', function($scope, $http, $timeout, Backend, Utils, Download, Persistence, gettext) {

	$scope.query = Utils.getQuery();
	gbackend = Backend; 


	$scope.currentDownloads = Download;
	if ( Persistence.has_key("downloads") ) {
		tmp = Persistence.get("downloads");
		for (i=0;i<tmp.length;i++) {
			$scope.currentDownloads.push(tmp[i]);
			gbackend.socket.on('progress_to_web', function (progress, _id) {
				mainDownloadHandler(progress, _id);
			});
		}
	}
	
	gbackend.socket.on('download_additional_info', function (key, _id, info) {
		for (i=0; i<$scope.currentDownloads.length; i++) 
			if ($scope.currentDownloads[i].id == _id) {
				$scope.currentDownloads[i][key] = info;

				if ( key == "finished") {
					$scope.currentDownloads[i].percent = "100";
					$scope.currentDownloads[i].percent_text = gettext("Complete (100%)");
					$scope.currentDownloads[i].style.panel_color = "success";
					$scope.currentDownloads[i].style.label_color = "success";
					$scope.currentDownloads[i].time_remaining = null;
					$scope.$apply();
				}
			} 
				
		Persistence.set("downloads", $scope.currentDownloads);
	});	

	

	function mainDownloadHandler(progress, _id) {
		//console.log(progress + '  [ ' + _id + ' ]');
		bck = progress;
		var patt=/.*\(([0-9]*)\.[0-9]\%\)/;
		var err=/Error.*\(([0-9]*)\.[0-9]\%\)/;
		var sec=/.*kB.*\/(.*)sec.*\(.*\%\).*/;
		progress = patt.exec(progress);
		error = err.exec(bck);
		

		for (i=0; i<$scope.currentDownloads.length; i++) {
			if ($scope.currentDownloads[i].id == _id) {
				currentD = $scope.currentDownloads[i];

				// Calculate time remaining: ============
				time_start = parseFloat(currentD["time_start"]);
				time_now   = parseFloat(Utils.currentTimestamp());
				time_used  = parseFloat(Utils.diffInSecs(time_now,time_start)); // In fact, there are miliseconds

				current_seconds = parseFloat(sec.exec(bck)[1]);
				total_seconds   = parseFloat(currentD.total_seconds);
				left_seconds    = parseFloat( total_seconds - current_seconds );

				download_speed  = current_seconds / time_used;
				time_remaining = left_seconds / download_speed;

				currentD["time_remaining"] = Utils.humanReadTimeRemaining(Math.ceil(time_remaining/1000));
				// END ===============

				currentD.style.label_color = "primary";
				currentD.percent = progress[1];
				currentD.percent_text = progress[0];
				
				if (error) {
					currentD.percent_text = "Error";
					currentD.style.panel_color = "danger";
					currentD.style.label_color = "danger";
					currentD.style.progress_color = "danger";
				}
				else if (currentD.percent == "100") {
					// Download finished (!! could be for error)
					currentD.style.panel_color = "success";
					currentD.style.label_color = "success";
					currentD["time_remaining"] = null;
				}

				Persistence.set("downloads", $scope.currentDownloads);
				
				$scope.$apply();
			}
		}
	}

	gbackend.getDirpath().then(function(dirpath) {
		$scope.dirpath = dirpath;
	});

	$scope.addDownload = function(newD) {
		newD["time_start"] = Utils.currentTimestamp(); // Add time support to download object
		newD["time_start_ui"] = (!Date) ? new Date().toString() : Date();;
		$scope.currentDownloads.push(newD); Persistence.set("downloads", $scope.currentDownloads);
		
		gbackend.startDownload(newD.command, newD.id, newD.orig);
		gbackend.socket.on('progress_to_web', function (progress, _id) {
			mainDownloadHandler(progress, _id);
		});
	}

	if ($scope.query) { // map GET parameters in Object: {"command":"asdas",[...]}

		if ( $scope.query.hasOwnProperty("command") ) {
			new_command = $scope.query.command;

			if ( $scope.query.hasOwnProperty("orig") ) new_orig = $scope.query.orig;
			else new_orig = new_command.split(" ")[2];
			if ( $scope.query.hasOwnProperty("img") ) new_img = $scope.query.img;
			else new_img = undefined;

			if ($scope.query.hasOwnProperty("name")) new_name = $scope.query.name;
			else new_name = "new video"; //inputC.split(" ")[inputC.split(" ").length-1]
			newD = {
				id: Utils.randomID(),
				percent: "0",
				percent_text: gettext("Connecting..."),
				command: new_command,
				orig: new_orig,
				img: new_img,
				moreinfo: false,
				name: new_name,
				style: { panel_color: 'primary', label_color: 'warning', progress_color: 'success'}
			};

			$scope.addDownload(newD);
			$scope.query = null;
			window.history.pushState(window.document.title, 'Title', '/');
		}
	} // END mapping GET parameters

	$scope.addDownloadFromTextarea = function() {
		inputC = $scope.commandInTextarea
		newD = {
			id: Utils.randomID(),
			percent: "0",
			percent_text: gettext("Connecting..."),
			command: inputC,
			orig: null,//inputC.split(" ")[2],
			img: undefined,
			moreinfo: false,
			name: inputC.split(" ")[inputC.split(" ").length-1], // improve this
			style: { panel_color: 'primary', label_color: 'warning', progress_color: 'success'}
		};
		$scope.addDownload(newD);
	};

	$scope.cancelDownload = function(_id) {
		for (i=0; i<$scope.currentDownloads.length; i++) {
			if ($scope.currentDownloads[i].id == _id) { 
				pos = i;
				$('#modalCancelDownloadConfirm_'+_id).modal();
				$('#modalCancelDownloadConfirm_'+_id+' button.okb').on("click", function(){
					$('#modalCancelDownloadConfirm_'+_id).modal('hide');
					$timeout(function(){
						$scope.currentDownloads.splice(pos,1);
						Persistence.set("downloads", $scope.currentDownloads);	
						gbackend.cancelDownload(_id);
						$scope.$apply();
					},500)
				});	
			}
		}
	};

	$scope.selectDownloadDir = function() {
		$(modalInfoChooseDir).modal();
		$('#modalInfoChooseDir button.okb').on("click", function(){
			$(modalInfoChooseDir).modal('hide');
			gbackend.launchChooseDir();
			gbackend.getDirpath().then(function(dirpath) {
				$scope.dirpath = dirpath;
			});
		});
	};
	$scope.disconnect = function () {
		$(modalInfoClose).modal();
		$('#modalInfoClose button.okb').on("click", function(){
				gbackend.closeAndExit();
				Persistence.clearAll();
				Utils.closeBrowserTab();
		});
	};
	$scope.disconnectFromKeppalive = function () {
		gbackend.closeAndExit();
		Persistence.clearAll();
		Utils.closeBrowserTab();
	};
	$scope.wheretodownload_clicked_change_state = function() {
		$scope.wheretodownload_clicked = $scope.wheretodownload_clicked ? false : true;
	};
	$scope.toggleMoreInfo = function(_id) {
		
		for (i=0; i<$scope.currentDownloads.length; i++)
			if ($scope.currentDownloads[i].id == _id)
				$scope.currentDownloads[i].moreinfo = $scope.currentDownloads[i].moreinfo ? false : true; 
		$timeout(function(){Persistence.set("downloads", $scope.currentDownloads);},500);
 	};
	$scope.show_modalHowInfoChooseDir = function() {
		$scope.modalHowInfoChooseDir = $scope.modalHowInfoChooseDir ? false : true;
		if ($scope.modalHowInfoChooseDir) $(modalHowInfoChooseDir).modal();
		$('#modalHowInfoChooseDir button.okb').on("click", function(){$(modalHowInfoChooseDir).modal('hide');});
	};
});








