define(["jquery", "qlik","./RTB_func", "text!./ReloadTaskButton.css", "text!./template.html", "text!./modal.html"], function($, qlik, RTB_func, cssContent, template, modal)  {
	if(!$("#inphinity-reload-button-style")[0]){
		$("<style id='inphinity-reload-button-style'>").html(cssContent).appendTo("head");
	}
    return{
        support :
        {
            snapshot : false,
            export : false,
            exportData : false
        },
		template: template,
        paint : function($element, layout){},
        controller : ['$scope', '$compile', function($scope, $compile){
			var modalContainer = $compile(modal)($scope);
			$("body").append(modalContainer);
			$scope.$on("$destroy", function(){ modalContainer.remove(); });
				
            var taskId = undefined;
            
            var app = qlik.currApp(this);
            var appId = app.id;
			var appName = "";
            var refreshInterval = $scope.layout.pRefresh || 3000;
			
			//app.getAppLayout().then(applayout => {appName = applayout.layout.qTitle;});
			
			if ($scope.layout.pTask == "") {
                RTB_func.getReloadTaskId(appId).then(function(id){taskId = id;});
            } else {
                taskId = $scope.layout.pTask;
            }
			
		
			$scope.closeModal = function(){
				$scope.showOverlay = false;
				$scope.reloadRunning = false;
				$scope.askReload = false;
				$scope.showLoader = false;
				$scope.showReloadError = false;
				$scope.showSuccess = false;
				$scope.showFail = false;
				$scope.showStarted = false;
				$scope.showScheduled = false;
				$scope.showUploadError = false;
			}
		
			$scope.confirmReload = function(){
                // Check if modal is displayed
                if ($scope.showOverlay) return false;
				$scope.showOverlay = true;
				if (taskId == undefined) {
					alert("Reload task is missing or you do not have access.");
					//closeModal();
					$scope.showOverlay = false;
					return false;
				} else {
					RTB_func.getReloadSessionId(taskId).then(function(sessionId){
						RTB_func.getTaskStatus(sessionId, function(stat){
							if (stat == 1 || stat == 2 || stat == 3 || stat == 4 || stat == 5) {
								$scope.reloadRunning = true;
							} else {
							
								if ($scope.layout.reloadType != "schedule") {
									$scope.askReload = true;
								} else {
									RTB_func.getCompositEventId(taskId).then(function(id){
										if (id == undefined) {
											$scope.askReload = true;
										} else {
											$scope.reloadRunning = true;
										}
									});
								}
							}
						});
					});
				}
			}
			
		
			$scope.uploadData = function() {
				if ($scope.layout.pDimSearch == true && $scope.layout.pFullTextSearch == true) {
					RTB_func.saveDimensionsAndFulltext(app, $scope).then(function(reply){
							if (reply == 201) {
								$scope.startReload();		
							} else {
								$scope.showOverlay = true;
								$scope.showUploadError = true;
								return;
							}
						});
				} else if ($scope.layout.pDimSearch == true) {
					if ($scope.layout.pDimSearch == true && $scope.layout.pDimSearchDim != ""  && $scope.layout.pDimSearchName != "") {
						RTB_func.saveSelectedDimensionsValues(app, $scope).then(function(reply){
							if (reply == 201) {
								$scope.startReload();		
							} else {
								$scope.showOverlay = true;
								$scope.showUploadError = true;
								return;
							}
						});
					}
				} else  if($scope.layout.pFullTextSearch == true) {
					if ($scope.layout.pFullTextSearch == true) {
						RTB_func.saveFullTextSearch(app,$scope).then(function(reply){
							console.log(reply);
							if (reply == 201) {
								$scope.startReload();		
							} else {
								$scope.showOverlay = true;
								$scope.showUploadError = true;
								return;
							}
						});
					}
				} else {
					$scope.startReload();		
				}
					

			}			
			$scope.startReload = function(){
				console.log("starting reload", taskId);
				$scope.askReload = false;
				if (taskId != 0) {
					if ($scope.layout.reloadType != "schedule") {
					console.log("DIRECT RELOAD");
					
					var resposne = qlik.callRepository('/qrs/task/' + taskId + '/start/synchronous', 'POST')
						.success(function(reply){
							var sessionId = reply.value
							if ($scope.layout.pWaiting) {
								$scope.showOverlay = true;
								$scope.showLoader = true;		
							} else {
								$scope.closeModal();
								$scope.showOverlay = true;
								$scope.showStarted = true;
							}
						RTB_func.waitSessionStatus(sessionId, function(){
							if ($scope.layout.pWaiting){
								$scope.showOverlay = true;
								$scope.showSuccess = true;
							}
						}, function(){
							if ($scope.layout.pWaiting){
								$scope.showFail = true;
								$scope.showOverlay = true;
							}
						});
					}).error(function(error){
						console.log("reload error", error);
						$scope.showOverlay = true;
						$scope.showReloadError = true;
					});
				} else {
						console.log("DELAYED RELOAD");
						var body = '{"schemaEvents":[{"reloadTask":{"id":"'+ taskId + '"},"enabled":true,"startDate":"9999-12-29T23:59:59.999Z","incrementOption":"0","name":"oneTimeTask","expirationDate":"9999-12-30T23:59:59.999Z","schemaFilterDescription":["* * - * * * * *"],"Timezone":"UTC","eventType":0,"incrementDescription":"0 0 0 0"}]}';
					
						var resposne = qlik.callRepository('/qrs/reloadtask/update', 'POST', body).success(function(reply) {
						
							RTB_func.getCompositEvent(taskId).then(function(event){
									var startDateM = new Date(event.createdDate);
									startDateM.setTime(startDateM.getTime() + (($scope.layout.pPostponeTime||2)* 1000));
									event.startDate = startDateM.toISOString();
									var resposne = qlik.callRepository('/qrs/schemaevent/' + event.id, "PUT", event).then(function(reply){
									
									if ($scope.layout.pWaiting) {
										$scope.showOverlay = true;
										$scope.showLoader = true;		
									} else {
										$scope.closeModal();
										$scope.showOverlay = true;
										$scope.showScheduled = true;
									}
							
					               setTimeout(function(){
										RTB_func.getCompositEventId(taskId).then(function(id){
											eventId = id;
											var resposne = qlik.callRepository('/qrs/schemaevent/' + eventId, "DELETE")	.then(function(reply){
											});
										});
									}, ($scope.layout.pPostponeTime*1000)+1000);

					               setTimeout(function(){
	  								 RTB_func.getReloadSessionId(taskId).then(function(sessionId){
										RTB_func.waitSessionStatus(sessionId, function(){
											if ($scope.layout.pWaiting){
												$scope.showOverlay = true;
												$scope.showSuccess = true;
											}
										}, function(){
											if ($scope.layout.pWaiting){
												$scope.showFail = true;
												$scope.showOverlay = true;
											}
										});
						  			  });
									}, ($scope.layout.pPostponeTime*1000)+1000);							
								});
							});
						}).error(function(error){
							console.log("reload error", error);
							getCompositEventId(taskId).then(function(id){
									eventId = id;
									var resposne = qlik.callRepository('/qrs/schemaevent/' + eventId, "DELETE")	.then(function(reply){
									});
								});
							$scope.showOverlay = true;
							$scope.showReloadError = true;
						});				
					}
					
				} else {
					$scope.closeModal();
				}
			};
		
		
		}],
        definition : {
            type : "items",
            component : "accordion",
            items : {
                dmServer : {
                    label : "Reload settings",
                    type : "items",
                    items : {
			            tasksAuto: {
            			  type: "boolean",
			              component: "switch",
			              label: "Automatic task selection",
			              ref: "reloadTaskAuto",
				          options: [{value: true, label: "On"}, {value: false, label: "Off"}],
						  defaultValue: true
						},
                        TaskProp : {
                            ref : "pTask",
                            type : "string",
                            label : "Task id",
                            expression: "optional",
              				show: function (data) {
								return data.reloadTaskAuto != true
							}
                        },

			            ReloadTypeProp: {
            			  type: "string",
			              component: "dropdown",
			              label: "Reload method",
			              ref: "reloadType",
				          options: [{value: "task", label: "Start task"}, {value: "schedule", label: "Schedule"}],
						  defaultValue: "task"
						},
						PostponeTimeProp: {
							ref:"pPostponeTime",
                            type : "number",
                            defaultValue : 2,
                            label : "Postpone time in seconds [2-60]",
                            expression : "optional",
              				show: function (data) {
								return data.reloadType === "schedule"
							}
							
						},
 						WaitingProp: {
							ref:"pWaiting",
							type: "boolean",
							label: "Waiting to reload finish",
							defaultValue: true,
							expression: "optional",
						},						
                        RefreshProp : {
                            ref : "pRefresh",
                            type : "number",
                            defaultValue : 3000,
                            label : "Refresh interval in ms",
                            expression : "optional"
                        },
					},
				},
				loadParameters : {
                    label : "Load parameters (experimental)",
                    type : "items",
                    items : {
						InfoLoadProp: {
                            component : "text",
                            label : "Use functionality to store selected filter or fulltext into app attached files",
						},
						FullTextSearchProp: {
							ref:"pFullTextSearch",
							type: "boolean",
							label: "Use full text",
							defaultValue: false,
							expression: "optional"
						},
                        FullTextSearchNameProp : {
                            ref : "pFullTextSearchVariable",
                            type : "string",
                            label : "Variable",
                            expression: "optional",
							show: function (d) { return d.pFullTextSearch == true; }
                        },
						
                        FullTextSearchSaveVariableProp : {
                            ref : "pFullTextSearchName",
                            type : "string",
                            label : "Save variable name",
                            expression: "optional",
							show: function (d) { return d.pFullTextSearch == true; }
                        },
						
						DimSearchProp: {
							ref:"pDimSearch",
							type: "boolean",
							label: "Use dimension filter",
							defaultValue: false,
							expression: "optional"
						
						},						
						DimSearchName: {
                            ref : "pDimSearchDim",
                            type : "string",
                            label : "Dimension name",
                            expression: "optional",
							show: function (d) { return d.pDimSearch == true; }								
						},
						DimSearchNameVariable: {
                            ref : "pDimSearchName",
                            type : "string",
                            label : "Save variable name",
                            expression: "optional",
							show: function (d) { return d.pDimSearch == true; }								
						},
				
                     }
                },						
				custom : {
  			       label : "Button customization",
                    type : "items",
                    items : {

	                    ButtonText : {
                            ref : "pButtonText",
                            type : "string",
                            label : "Button label",
                            expression: "optional",
			    			defaultValue: "Reload"
                        },
	                    ButtonTextSize : {
                            ref : "pButtonTextSize",
                            type : "number",
                            label : "Button text size in px",
                            expression: "optional",
						    defaultValue: 30
                        },
						ButtonColor: {
							label:"Background color",
							component: "color-picker",
							ref: "backgroundColor",
							type: "object",
							defaultValue: {
               					color: "#4e0a55",
                				index: "-1"
              				}
						},
						TextColor: {
							label:"Text color",
							component: "color-picker",
							ref: "textColor",
							type: "object",
							defaultValue: {
               					color: "#ffFFFF",
                				index: "-1"
              				}
						}						
						
                    }
                },
				about: {
					label: "About",
					type: "items",
					items: {
						text: {
							label: "Inphinity Reload Task Button extension",
							component: "text"
						},				
						version: {
							label: 'Version: 1.0',
							component: "text"
						}					
					}
				}		    
            }
        }
    };


});
