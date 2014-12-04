var _ = require("underscore");
var exec = require("child_process").exec;
var Events = require("./lib/Events");

// iSCSITarget #############################
var InternalEvents;

function iSCSITarget(showlogs){	
	this.showlogs = (showlogs != null) ? showlogs : false;
	this.nodes = {
		targets: {},
		sessions: {},
		service: {}
	};

	this.only_last_events = false;
	this.nodesCount = Object.keys(this.nodes).length;
	this.resultCount = 0;
	this.events = new Events();
		
	InternalEvents = new Events();
		
	var me = this;
	InternalEvents.OnBeforeOpen = function(cmd){
		if (me.showlogs) console.log("InternalEvents.OnBeforeOpen(" + cmd + ")");
		
		if (me.events.OnBeforeOpen) me.events.OnBeforeOpen(cmd);
	};
	InternalEvents.OnAfterOpen = function(cmd){		
		// if (me.events.OnAfterOpen) me.events.OnAfterOpen();	
		if(me.only_last_events) me.resultCount++;
		
		if (me.showlogs) console.log("InternalEvents.OnAfterOpen(" + JSON.stringify({"cmd": cmd, "resCount":me.resultCount, "nodesCnt":me.nodesCount}) + ")");
		
		if (!me.only_last_events || (me.resultCount == me.nodesCount)){
			if(me.only_last_events) me.only_last_events = false;
			if (me.events.OnAfterOpen) me.events.OnAfterOpen(cmd);	
		}
	};
	InternalEvents.OnBeforeParseData = function(datas){
		if (me.events.OnBeforeParseData) me.events.OnBeforeParseData(datas);
	};
	InternalEvents.OnAfterParseData = function(datas){
		if (me.events.OnAfterParseData) me.events.OnAfterParseData(datas);
	};
};

iSCSITarget.prototype = {
	Open: function(){
		this.resultCount = 0;
		this.only_last_events = true;
		for(var Command in this.nodes){
			this["Get" + Command.charAt(0).toUpperCase() + Command.slice(1)]();
		}
	},
	CallCmd: function(cmd,result){		
		var me = this;
		
		try{			
			exec(cmd, function (error, stdout, stderr) {
				if (me.showlogs) console.log("exec " + cmd);
		        	
				if (error){
					if (me.showlogs){
						console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
			        		console.log('exec error: ' + error);	
			        		console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");	
					}
		        		me.nodes[result] = {"error": error, type: "error"};
		        	}
		        	else if(stderr){
							if (me.showlogs){
				        		console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
				        		console.log('stderr: ' + stderr);	
				        		console.log("EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
							}
                        	me.nodes[result] = {"error": stderr, type: "stderr"};
		        	}
		        	else{
						me.nodes[result] = me.parseData(stdout,result);
						
						if (me.showlogs) console.log(JSON.stringify(me.nodes.targets,null,4));
		        	}
				
					InternalEvents.OnAfterOpen(cmd);
		        }); 
		} catch (err) {
			me.nodes.targets = {"error": err, type: "exception"};
			InternalEvents.OnAfterOpen(cmd);
		}	
		
	},
	GetTargets: function(){
		var cmd = "cat /etc/iet/ietd.conf | grep -v \"^\s*#.*\" | grep -v \"^$\"";
		this.CallCmd(cmd,"targets");
	},
	GetSessions: function(){
		var cmd = "cat /proc/net/iet/session | sed -e 's/^[[:space:]]*//'";
		this.CallCmd(cmd,"sessions");
	},
	GetService: function(){
		var cmd = "service iscsitarget status";	
		this.CallCmd(cmd,"service");	
	},
	parseTargets: function(piSCSITarget){
		var me = this;		
		InternalEvents.OnBeforeParseData(piSCSITarget);
		
		var retval = [];
		var target = "";
		var tmp = piSCSITarget.split("\n");
		
		for(var line in tmp){
			
			if (tmp[line].substr(0,7) == "Target "){
				if (target != "") retval.push(target.substr(0,target.length-1));	
				target = "";		
			}
			
			target += tmp[line].replace(/^[\s]*/,"",'gi') + "|";
		}
		
		for(var idx in retval){

			tmp = retval[idx].split("|");
			retval[idx] = {};
			
			for(tmpidx in tmp){
				
				tmp[tmpidx] = tmp[tmpidx].split(" "); 	
				
				if (tmp[tmpidx].length <= 2)				
					retval[idx][tmp[tmpidx][0]] = tmp[tmpidx][1];				
				else if(tmp[tmpidx][2]){
					
					var tmptab = tmp[tmpidx][2].split(",");
					
					for(var idxtab in tmptab){
						var smalltab = tmptab[idxtab].split("=");
						
						tmptab[idxtab] = "\"" + smalltab[0] + "\": \"" + smalltab[1] + "\"";
					}
					
					retval[idx][tmp[tmpidx][0]] = JSON.parse("{\"" + tmp[tmpidx][1] + "\": {" + tmptab.join(",") + "}}");
				}
					
			}
		}
					
		InternalEvents.OnAfterParseData(retval);
		
		return retval;	
	},
	parseSessions: function(iSCSISession) {
		var retval = [];
		var r;

		_.each(iSCSISession.split("\n"),function(line,id){
			var spline = line.split(" ");

			if (line.indexOf('tid')==0) {
				if (id>0)
					retval.push(r);

				r = {
					sessions: []
				};
				
				r.Id = spline[0].replace(/[^\d]/g,'');
				r.Target = spline[1].substring(5);
			}
			else if(line.indexOf('sid')==0) {
				r.sessions.push({
					Id: spline[0].replace(/[^\d]/g,''),
					initiator: spline[1].substring(10),
					infos: []
				});
			}
			else if (line.indexOf('cid')==0) {
				r.sessions[Object.keys(r.sessions).length-1].infos.push({
					Id: spline[0].replace(/[^\d]/g,''),
					ip: spline[1].substring(3),
					state: spline[2].substring(6),
					hd: spline[3].substring(3),
					dd: spline[4].substring(3)
				});
			}
		});

		if (iSCSISession.split("\n")[iSCSISession.split("\n").length-1].indexOf('tid')<0)
			retval.push(r);

		return retval;
	},
	parseService: function(piSCSIService){
		InternalEvents.OnBeforeParseData(piSCSIService);
		var retval = piSCSIService.replace(/^[\*\s]*/,"",'gi').split("\n").slice(0,1);			
		
		InternalEvents.OnAfterParseData(retval[0]);
				
		return retval[0];
	},
	parseData: function(piSCSI,result) {
		
		switch(result){
			case "targets" : return this.parseTargets(piSCSI);
			break;
			case "sessions" : return this.parseSessions(piSCSI);
			break;
			case "service" : return this.parseService(piSCSI);
			break;
			default: return null;
			break;
		}
	}
}
// iSCSITarget #############################

module.exports = iSCSITarget;
