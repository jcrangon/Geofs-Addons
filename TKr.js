// ==UserScript==
// @name TKr
// @description Flight Track Recorder for GeoFs
// @author TKE587
// @namespace GeoFS-Plugins
// @match http://*/geofs.php*
// @match https://*/geofs.php*
// @run-at document-end
// @version 0.1
// @grant none
// ==/UserScript==


(function() {
    'use strict';
    var timerList = [];
    var callSign = null;
    var rec = null;
    var TRKpanelIsVisible=false;
    var isPaused = false;
    var timeBetweenSnaps = 10000;
    var metersToFeet = 3.28084;

    function togglePanel(panel){
        if (panel.classList) {
                panel.classList.toggle("elTRKpanelHidden");
        }
        else {
            var classes = panel.className.split(" ");
            var i = classes.indexOf("elTRKpanelHidden");

            if (i >= 0){
                classes.splice(i, 1);
            }
            else{
                classes.push("elTRKpanelHidden");
            }
            panel.className = classes.join(" ");
        }
    }

    function fixAngle360(a) {
        a %= 360;
        return 0 <= a ? a : a + 360
    }

    var displayAltitude = function(a) {
        return a = 18E3 < a ? "FL" + 5 * Math.round(a / 500) : a + "ft."
    }

    function copyStringToClipboard (str) {
        // Create new element
        var el = document.createElement('textarea');
        // Set value (string to be copied)
        el.value = str;
        // Set non-editable to avoid focus and move outside of view
        el.setAttribute('readonly', '');
        el.style = {position: 'absolute', left: '-9999px'};
        document.body.appendChild(el);
        // Select text inside element
        el.select();
        // Copy text to clipboard
        document.execCommand('copy');
        // Remove temporary element
        document.body.removeChild(el);
    }

    function Recorder(callSign){
        this.snaps = [];
        this.id = null;
        this.user = callSign;
        this.routeLayer = null;
        this.init();
    }

    Recorder.prototype = {
        constructor : Recorder,
        init : function(){

            this.id = "rec-" + timerList.length;
            timerList.push(this.id);
        },

        start : function(){
            const fetchUsers = async () => {
                try {
                    const res = await fetch('https://net.geo-fs.com:8080/map');
                    if (!res.ok) {
                        throw new Error(res.status);
                    }
                    const data = await res.json();
                    //console.log(data);
                    let users = data.users;
                    let userFound = false;
                    //console.log(users);
                    users.forEach(user => {
                        if(user.cs == this.user){
                            this.makeSnap(user);
                            userFound=true;
                            elTRKrBtn.setAttribute("style", "background:green");
                            if(!TRKpanelIsVisible){
                                togglePanel(TRKpanel);
                                TRKpanelIsVisible=true;
                                BtnRecPause.setAttribute("class","");
                                CopyClip.setAttribute("class","");
                            }
                        }
                    });
                    if(!userFound){
                        elTRKrBtn.setAttribute("style", "background:orange");
                    }
                } catch (error) {
                    clearInterval(timerList[this.id]);
                    console.log(error);
                    alert("An error occurred while fetching data...");
                }
            }
            fetchUsers();
            timerList[this.id] = setInterval(function(){
                fetchUsers();
            },timeBetweenSnaps);
        },
        stop : function(){
            if(timerList[this.id]){
                clearInterval(timerList[this.id]);
            }
            TRKpanel.innerHTML = "";
            if(TRKpanelIsVisible){
                togglePanel(TRKpanel);
                TRKpanelIsVisible=false;
            }
        },
        pause: function(){
            if(timerList[this.id]){
                clearInterval(timerList[this.id]);
            }
            elTRKrBtn.setAttribute("style", "background:orange");
        },
        makeSnap : function(user){
            //console.log(user);
            let snap={};
            snap.cs = user.cs;
            let currentdate = new Date();
            snap.t = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/"
                + currentdate.getFullYear() + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
            snap.lat = user.co[0];
            snap.lon = user.co[1];
            if(user.st.gr){
                snap.alt ="GND";
            }
            else{
                snap.alt = displayAltitude(parseInt(user.co[2]*metersToFeet));
            }
            snap.hdg = parseInt(fixAngle360(user.co[3]));
            snap.spd = user.st.as + " kt";
            this.snaps.push(snap);
            //console.log(this.snaps);
            this.log(TRKpanel, snap);

            if(typeof(ui.mapInstance) !=='undefined'){
                var route = [];
                var polyline = [];
                this.snaps.forEach(snap => {
                    route.push([snap.lat,snap.lon]);
                });
                //console.log(route);
                if(this.routeLayer !== null){
                    this.routeLayer.remove();
                }
                polyline = L.polyline(route, {color: 'green', weight:6});
                this.routeLayer = L.layerGroup().addLayer(polyline).addTo(ui.mapInstance.apiMap.map);
            }

        },
        log: function(el, snap){
            let sn = "<p>";
            sn += snap.t + "<br>Lat: " + snap.lat + "<br>Lon: " + snap.lon + "<br>" + snap.alt + " / " + snap.hdg + "° / " + snap.spd + "<br>";
            sn += "</p>";
            TRKpanel.innerHTML += sn;
        },
        getRoute : function(){
            var route = [];
            var txt = "[";
            this.snaps.forEach(snap => {
                    txt += "[" + snap.lat + "," + snap.lon + "],";
                    route.push([snap.lat,snap.lon]);
                });
            txt += "]";
            txt = txt.replace("],]", "]]");
            return txt;
        },
    }

    var elTRKrBtn = document.createElement("button");
    elTRKrBtn.setAttribute("class", "mdl-button mdl-js-button geofs-f-standard-ui");
    elTRKrBtn.setAttribute("id", "TRKr-toggle");
    elTRKrBtn.setAttribute("style", "background:red");
    elTRKrBtn.innerHTML = "TRKr";
    document.getElementsByClassName("geofs-ui-bottom")[0].appendChild(elTRKrBtn);

    var TRKrBtn = document.getElementById("TRKr-toggle");

    var elTRKpanelstyle = document.createElement("style");
    elTRKpanelstyle.innerHTML =".elTRKpanelVisible{display:block;position:absolute;bottom:40px;right:0;padding:20px;width:250px;height:400px;overflow:auto;background:#FFF;font-size:10px;font-family:monospace; z-index:999999999;border:1px dashed red;}\n";
    elTRKpanelstyle.innerHTML +=".elTRKpanelVisible p {font-size:10px;font-family:monospace;}";
    elTRKpanelstyle.innerHTML +=".elTRKpanelHidden{display:none;}";
    elTRKpanelstyle.innerHTML +=".TKbtnHide{display:none;} .TKbtnShow {display:inline-block;}";
    var elTRKpanel = document.createElement("div");
    elTRKpanel.setAttribute("class", "elTRKpanelVisible elTRKpanelHidden");
    elTRKpanel.setAttribute("id", "TRKpanel");
    document.getElementById("geofs-ui-3dview").appendChild(elTRKpanelstyle);
    document.getElementById("geofs-ui-3dview").appendChild(elTRKpanel);
    var TRKpanel = document.getElementById("TRKpanel");


    var elBtnRecPause = document.createElement("button");
    elBtnRecPause.setAttribute("id","TKPauseBtn");
    elBtnRecPause.setAttribute("style","cursor:pointer;");
    elBtnRecPause.setAttribute("class","TKbtnHide");
    elBtnRecPause.innerHTML = "Pause";

    var elCopyClip = document.createElement("button");
    elCopyClip.setAttribute("id","copyClipBtn");
    elCopyClip.setAttribute("style","cursor:pointer;margin-left:5px;");
    elCopyClip.setAttribute("class","TKbtnHide");
    elCopyClip.innerHTML = "ClipBoard";

    document.getElementsByClassName("geofs-ui-bottom")[0].appendChild(elBtnRecPause);
    document.getElementsByClassName("geofs-ui-bottom")[0].appendChild(elCopyClip);

    var BtnRecPause = document.getElementById("TKPauseBtn");
    var CopyClip = document.getElementById("copyClipBtn");

    BtnRecPause.addEventListener("click",function(e){
        //console.log("PAUSE");
        var b = document.getElementById("TKPauseBtn");
        if(isPaused){
            b.setAttribute("style", "background:none;cursor:pointer;");
            b.innerHTML = "Pause";
            isPaused = false;
            rec.start();
        }
        else{
            b.setAttribute("style", "background:orange;cursor:pointer;");
            b.innerHTML = "Paused";
            isPaused = true;
            rec.pause();
        }
    });
    CopyClip.addEventListener("click",function(){
        var txt = TRKpanel.innerHTML;
        txt=txt.replace(/<p>/gi,"");
        txt=txt.replace(/<b>/gi,"");
        txt=txt.replace(/<\/b>/gi,"");
        txt=txt.replace(/<\/p>/gi,"\n");
        txt=txt.replace(/<br>/gi,"\n");
        txt += "\n"+ "Flight Path:\n" + rec.getRoute() + "\n";
        copyStringToClipboard (txt);
    });

    setTimeout(function(){
        TRKrBtn.setAttribute("style","background:none;");
        TRKrBtn.addEventListener("click", function(e){
            elTRKrBtn.setAttribute("style", "background:none");
            callSign = prompt("Enter the CALLSIGN to track (case sensitive):");
            if(TRKpanelIsVisible){
                togglePanel(TRKpanel);
                TRKpanelIsVisible=false;
                BtnRecPause.setAttribute("class","TKbtnHide");
                BtnRecPause.setAttribute("style", "background:none;cursor:pointer;");
                CopyClip.setAttribute("class","TKbtnHide");
                isPaused=false;
            }
            if(rec !== null){
                rec.stop();
                rec=null;
            }
            if(callSign !== null && callSign.trim() !== ""){
                callSign = callSign.trim();

                TRKpanel.innerHTML="<p><b>Tracking... " + callSign + "</b></p>";

                rec = new Recorder(callSign);
                rec.start();
            }


        });
    },2000);


})();