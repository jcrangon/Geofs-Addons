// ==UserScript==
// @name TKTrace
// @description Flight Track plotter for GeoFs
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
    var polyline, routeLayer;
    var routeOk = false;
    var elTKTraceBtn = document.createElement("button");
    elTKTraceBtn.setAttribute("class", "mdl-button mdl-js-button geofs-f-standard-ui");
    elTKTraceBtn.setAttribute("id", "TKTrace-toggle");
    elTKTraceBtn.innerHTML = "TRACE";
    document.getElementsByClassName("geofs-ui-bottom")[0].appendChild(elTKTraceBtn);

    var TraceBtn = document.getElementById("TKTrace-toggle");

    TraceBtn.addEventListener("click", function(e){
        if(typeof(ui.mapInstance) == 'undefined'){
            alert("Open Nav Panel First to use the Trace Functionality");
        }
        else{
            var rte = null;
            var fRte = [];
            var tempRte=[];
            var routeOk=true;
            rte = prompt("Enter your route:");
            if(rte != null){
                if(rte =="" || rte.toLowerCase() == "remove"){
                   if(rte.toLowerCase() == "remove" && typeof(routeLayer)!=="undefined"){
                     routeLayer.remove();
                   }
                   else{
                     rte= undefined;
                     routeOk=false;
                     alert('Empty route!');
                   }
                }
                else{
                    rte = rte.replace(/\[/gi, '');
                    rte = rte.replace(/\]/gi, '');
                    rte = rte.replace(/ /gi, '');
                    var formatedRoute = rte.split(",");
                    console.log(formatedRoute);
                    if(0 !== formatedRoute.length % 2){
                        routeOk=false;
                        alert("Invalid Route!! Check Waypoints Coordinates");
                    }
                    else{
                        for(var i=0;i<formatedRoute.length;i++){
                           tempRte.push(formatedRoute[i]);
                           if(i!==0 && 0 !== i % 2){
                               fRte.push(tempRte);
                               tempRte=[];
                           }
                       }
                    }
                }
                if(routeOk){
                    if(typeof(polyline)!=="undefined"){
                        routeLayer.remove();
                    }
                    polyline = L.polyline(fRte, {color: 'purple', weight:6});
                    console.log(polyline);
                    routeLayer = L.layerGroup().addLayer(polyline).addTo(ui.mapInstance.apiMap.map);
                }
            }

        }
    });
})();