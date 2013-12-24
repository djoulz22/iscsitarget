var _ = require("underscore");
var exec = require("child_process").exec;
var Events = require("./lib/Events");

// iSCSITarget #############################
var InternalEvents;

function iSCSITarget(showlogs){	
	this.showlogs = (showlogs != null) ? showlogs : false;
	this.nodes = {
		targets: {},
		service: {}
	};
	this.only_last_events = false;
	this.events = new Events();
		
	InternalEvents = new Events();
		
	var me = this;
	InternalEvents.OnBeforeOpen = function(){		
		if (me.events.OnBeforeOpen) me.events.OnBeforeOpen();
	};
	InternalEvents.OnAfterOpen = function(){		
		if (me.events.OnAfterOpen) me.events.OnAfterOpen();	
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
		this.GetTargets();
		this.GetService();	
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
			case "service" : return this.parseService(piSCSI);
			break;
			default: return null;
			break;
		}
	}
}
// iSCSITarget #############################

module.exports = iSCSITarget;