// JavaScript
define( ['jquery','qlik'], function ( $, qlik) { 
		
    function waitSessionStatus(sessionId, onSuccess, onFail) {
        getTaskStatus(sessionId, function(stat){
            if (stat == 1 || stat == 2 || stat == 3 || stat == 4 || stat == 5) {
                setTimeout(function(){
					waitSessionStatus(sessionId, onSuccess, onFail)
				}, 1000);
            } else if (stat == 7) {
				onSuccess();
			} else {
				onFail();
			}
        });
    }

    function getTaskStatus(session, callback) {
        if (session == undefined){ callback(0);	return; }
		qlik.callRepository('/qrs/executionresult?filter=ExecutionId eq ' + session, 'GET').success(function(reply){
			if (reply && reply[0]) {
				callback(reply[0].status);
			} else {
				callback(0);
			}
		}).error(function(err){
			callback(-1);
		});
    };

	function getReloadTaskId(appId){
        return qlik.callRepository('/qrs/reloadtask/full').then(function(reply){
			var tasks = reply.data.filter(function(task)
			{ return task.app.id == appId;});
			if (tasks[0]) return tasks[0].id;
			else return undefined;
        });
    }

	function getCompositEventId(taskId){
        return qlik.callRepository('/qrs/schemaevent/full').then(function(reply){
		console.log(reply)
			var events = reply.data.filter(function(event)
			{ return  event.reloadTask != null && event.reloadTask.id == taskId && event.name == "oneTimeTask" ;});
			if (events[0]) return events[0].id;
			else return undefined;
        });
    }

	function getCompositEvent(taskId){
        return qlik.callRepository('/qrs/schemaevent/full').then(function(reply){
		console.log(reply)
			var events = reply.data.filter(function(event)
			{ return  event.reloadTask != null && event.reloadTask.id == taskId && event.name == "oneTimeTask" ;});
			if (events[0]) return events[0];
			else return undefined;
        });
    }


    function getReloadSessionId(taskId){
        if (taskId == undefined) return undefined;
            return qlik.callRepository('/qrs/executionsession').then(function(reply){
                var sessions = reply.data.filter(function(task){ return task.reloadTask.id == taskId;});
				if (sessions[0]){
					return sessions[0].id;
				}
			}, function(error) {
                return undefined;
            });
    }
 
 
	function uploadFileIntoApp(appId, fileName, body){
		//body content of file as sting
        return qlik.callRepository('/qrs/appcontent/'+ appId + '/uploadfile?externalpath=' +fileName+ '.txt&overwrite=true','POST',body).then(function(reply){
			if (reply) return reply;
			else return undefined;
        });
    }

    function saveDimensionsAndFulltext(app, $scope){
		return saveSelectedDimensionsValues(app, $scope).then(function(reply) {
			if (reply && reply == 201) {
				return saveFullTextSearch(app, $scope).then(function(reply) {
					if (reply && reply == 201) {					
						return reply;
					} else {
						return -1;	
					}
				})
			} else {
				return -1;
			}					
		})
	}


    function saveSelectedDimensionsValues(app, $scope){
 	  return app.createList({
	    qDef: {
    	     qFieldDefs: [$scope.layout.pDimSearchDim] //set fieldname
     	},
     	qAutoSortByState: {
          qDisplayNumberOfRows: 1
     	},
     	qInitialDataFetch: [{
          qHeight : 100, //can set number of rows returned
          qWidth : 1
	    }]
		}).then(function(reply) {
    		 var rows = _.flatten(reply.layout.qListObject.qDataPages[0].qMatrix);
	    	 var selected = rows.filter(function(row) {
        		  return row.qState === "S";
     	 	 });
			var selectedList = "";
			selected.forEach(function(item, index, array) {
				selectedList = selectedList + item.qText + "\n"
			});
			reply.close();
	
			return uploadFileIntoApp(app.id,$scope.layout.pDimSearchName, $scope.layout.pDimSearchName + "\n" + selectedList).then(function(reply){
				if (reply) {
					return reply.status;
				} else {
					return -1;
				}					
			});	
		});
	}
	
 
  
  	function saveFullTextSearch(app, $scope){
  				if ($scope.layout.pFullTextSearch == true && $scope.layout.pFullTextSearchName != "" && $scope.layout.pFullTextSearchVariable != "") {
					var fullTextSearchString = '';
					return app.variable.getContent($scope.layout.pFullTextSearchVariable).then(function ( reply ) {
    					 fullTextSearchString = reply.qContent.qString;
  						 return uploadFileIntoApp(app.id, $scope.layout.pFullTextSearchName,  $scope.layout.pFullTextSearchName + "\n" + fullTextSearchString).then(function(reply){
						 	console.log(reply);
							if (reply) {
								return reply.status;
							} else {
								return -1;
							}
						 });	
						 
					}, function(error) {
                		fullTextSearchString = $scope.layout.pFullTextSearchVariable;
						return uploadFileIntoApp(app.id, $scope.layout.pFullTextSearchName,  $scope.layout.pFullTextSearchName + "\n" + fullTextSearchString).then(function(reply){
							console.log(reply);
								if (reply) {
									return reply.status;
								} else {
									return -1;
								}
						});	
            		});
	            } else {
					if ($scope.layout.pFullTextSearchName != "") {
						return uploadFileIntoApp(app.id, $scope.layout.pFullTextSearchName,  $scope.layout.pFullTextSearchName + "\n").then(function(reply){
								console.log(reply);
								if (reply) {
									return reply.status;
								} else {
									return -1;
								}
							});	
					}
        	    }	
  	}
 
	return {
		waitSessionStatus: waitSessionStatus,
		getTaskStatus: getTaskStatus,
		getReloadTaskId: getReloadTaskId,
		getReloadSessionId: getReloadSessionId,
		getCompositEventId:getCompositEventId,
		getCompositEvent:getCompositEvent,
		uploadFileIntoApp:uploadFileIntoApp,
		saveSelectedDimensionsValues: saveSelectedDimensionsValues,
		saveFullTextSearch: saveFullTextSearch,
		saveSelectedDimensionsValues: saveSelectedDimensionsValues,
		saveDimensionsAndFulltext: saveDimensionsAndFulltext
	} 
});
