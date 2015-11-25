/**
 * Created by yidu on 11/10/15.
 */

//地图对象
var map;
//谷歌地图与bing地形地图
//var mapLayer,hybridLayer;
//各种叠加图层
var locationLayer, heatmapLayer, freedrawLayer;
var meteorologicalStationLayer;

var overAllBrush;
var paintControl = {
    calendar        :   false,
    calendarType    :   1,//0dayofmonth
    trend           :   false,
    stations        :   false,
    mstations       :   false,
    heatmap         :   false,
};
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code

//各种过滤控件
var polygonConrtol, navControl,provinceSelectionControl;

var temp;

//option of points
var optPoint = {fillColor:'#ee0011', fill:true, color:'#FF0000'};
//
var meteorologicalStationOption = {fillColor:'#00ee11', fill:true, color:'#0000FF'};

//configuration of heatmap
var cfg = {
    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    "radius": 1,
    "maxOpacity": .8,
    // scales the radius based on map zoom
    "scaleRadius": true,
    // if set to false the heatmap uses the global maximum for colorization
    // if activated: uses the data maximum within the current map boundaries
    //   (there will always be a red spot with useLocalExtremas true)
    "useLocalExtrema": true,
    // which field name in your data represents the latitude - default "lat"
    latField: 'lat',
    // which field name in your data represents the longitude - default "lng"
    lngField: 'lng',
    // which field name in your data represents the data value - default "value"
    valueField: 'count'
};

var cursorX;
var cursorY;
document.onmousemove = function(e){
    cursorX = e.pageX;
    cursorY = e.pageY;
}
var piemenu;

function initUIs(){
    $('#map').css("width", window.screen.availWidth).css("height", window.screen.availHeight);
    //$('#map').css("width", "800").css("height", "600px");
    L.mapbox.accessToken = 'pk.eyJ1Ijoic3Vuc25vd2FkIiwiYSI6ImNpZ3R4ejU3ODA5dm91OG0xN2d2ZmUyYmIifQ.jgzNI617vX6h48r0_mRzig';
    map = L.mapbox.map('map', 'mapbox.streets')
        .setView([38.0121105, 105.6670345], 5);

    //add location layer
    locationLayer = L.layerGroup();
    locationLayer.addTo(map);

    //meteorologicalStationLayer
    meteorologicalStationLayer = L.layerGroup();
    meteorologicalStationLayer.addTo(map);

    //TODO createProvinceSelControl();
    L.control.layers(map).addTo(map);

    piemenu = new wheelnav('piemenu');
    //piemenu.slicePathFunction = slicePath().DonutSlice;
    //操作-> group、ungroup(divided by province/county)
    //Analysis->trends, factors, factors with wind,  nearby

    piemenu.createWheel(['zoom', 'group', 'ungroup', 'factors', 'factors with wind', 'nearby']);
    piemenu.navItems[0].navigateFunction = zoomAndCenter;
    //TODO
    piemenu.wheelRadius = 50;

    createChinamap();

}

function createChinamap(){
    var countries = [];
    var countriesOverlay = L.d3SvgOverlay(function(sel, proj) {

        var upd = sel.selectAll('path').data(countries);
        upd.enter()
            .append('path')
            .attr('d', proj.pathFromGeojson)
            .attr('stroke', 'black')
            //.attr('fill', function(){ return d3.hsl(Math.random() * 360, 0.9, 0.5) })
            .attr('fill-opacity', '0');
        upd.attr('stroke-width', 1 / proj.scale);
    });

    d3.json("maps/china_provinces.json", function(data) { countries = data.features; countriesOverlay.addTo(map) });

}

/**
 * control the visiliblity of calendar
 */
function controlCalendar(){
    paintControl.calendar = $("#controlCalendar").is( ':checked' );
    if($("#controlCalendar").is( ':checked' )){
        $("#calendar").show();
        $("#calendar").css("visibility", "visible");
    }else{
        $("#calendar").hide();
    }
}

function controlTrend(){
    paintControl.trend = $("#controlTrend").is( ':checked' );
    if($("#controlTrend").is( ':checked' )){
        $("#trendpanel").show();
        $("#trendpanel").css("visibility", "visible");
    }else{
        $("#trendpanel").hide();
    }
}

/**
 * init calendar view
 * TODO change to canvas
 */
function createCalendarView(){
    if($("#showHourOfWeek" ).is( ':checked' )){
        paintControl.calendarType   =   1;
    }else if($("#showHourOfWeekSeparately" ).is( ':checked' )){
        paintControl.calendarType   =   2;
    }else if($("#showDayOfMonth" ).is( ':checked' )){
        paintControl.calendarType   =   3;
    }else if($("#showDayOfMonthSeparately" ).is( ':checked' )){
        paintControl.calendarType   =   4;
    }


    var rows, cols, gridWidth, gridHeight;

    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = $("#calendar").width() - margin.left - margin.right,
        height = $("#calendar").height() - margin.top - margin.bottom,
        colors = ["#FF0000","#FFFF00","00FF00"];

    if($("#showHourOfWeek" ).is( ':checked' ) || $("#showHourOfWeekSeparately" ).is( ':checked' ) ){
        rows = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        cols = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
        gridWidth = Math.floor(width / 24);
        gridHeight = Math.floor(height / 7);
    }else if($("#showDayOfMonth" ).is( ':checked' ) || $("#showDayOfMonthSeparately" ).is( ':checked' )){
        gridWidth = Math.floor(width / 30);
        gridHeight = Math.floor(height / 12);
        rows = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        cols = [];

        for(var i = 1; i <= 30; i ++){
            cols.push(i);
        }
    }

    d3.select("#calendar").selectAll("svg").remove();
    var svg = d3.select("#calendar").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var rowLabels = svg.append("g")
        .selectAll(".rowLabel")
        .data(rows)
        .enter().append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return i * gridHeight; })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + gridHeight / 1.5 + ")")
        .attr("class", function () {return "rowLabel mono axis axis-workweek";});

    var colLabels = svg.append("g")
        .selectAll(".colLabel")
        .data(cols)
        .enter().append("text")
        .text(function(d) { return d; })
        .attr("x", function(d, i) { return i * gridWidth; })
        .attr("y", 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + gridWidth / 2 + ", -6)")
        .attr("class", function() { return "colLabel mono axis axis-worktime"; });

    var cities = "";
    if(filteredData.length != 0){
        cities += ("codes[]="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes[]="+filteredData[i].code);
            }
        }
    }
    if(overAllBrush != null){
        cities += "&startTime="+overAllBrush[0] +"&endTime="+overAllBrush[1];
    }

    if($("#showHourOfWeek" ).is( ':checked' )){

        $.ajax({
            url: "hourOfWeekTrend.do",
            type: "post",
            data: cities,
            success: function (returnData) {
                var data = JSON.parse(returnData);
                var colorScale = d3.scale.linear()
                    .domain([150, 0]).range(colors);

                var cards = svg.append("g")
                    .selectAll(".col")
                    .data(data, function (d) {
                        return d._id.hourofdayjb + ':' + d._id.dayofweekbj;
                    });

                cards.append("title");

                cards.enter()
                    .append("rect")
                    .attr("x", function (d) {
                        return (d._id.hourofdayjb) * gridWidth;
                    })
                    .attr("y", function (d) {
                        return (d._id.dayofweekbj + 5) % 7 * gridHeight;
                    })
                    .attr("class", "col bordered")
                    .attr("width", gridWidth)
                    .attr("height", gridHeight)
                    .style("fill", colors[0]);

                cards.transition().duration(1000)
                    .style("fill", function (d) {
                        return colorScale(d.pm25);
                    });

                cards.select("title").text(function (d) {
                    return d.pm25;
                });
                cards.exit().remove();
            }
        });
    }else if($("#showDayOfMonth" ).is( ':checked' )){

        $.ajax({
            url:"dayTrendsByCodes_v2.do",
            type:"post",
            data: cities,
            success:function(returnData){
                var data = JSON.parse(returnData);
                var colorScale = d3.scale.linear()
                    .domain([150, 0]).range(colors);

                var cards = svg.append("g")
                    .selectAll(".col")
                    .data(data, function(d) {
                        return d._id.day+':'+d._id.month;});

                cards.append("title");

                cards.enter()
                    .append("rect")
                    .attr("x", function(d) {return (d._id.day - 1) * gridWidth; })
                    .attr("y", function(d) { return (d._id.month - 1) * gridHeight; })
                    .attr("class", "col bordered")
                    .attr("width", gridWidth)
                    .attr("height", gridHeight)
                    .style("fill", colors[0]);

                cards.transition().duration(1000)
                    .style("fill", function(d) { return colorScale(d.pm25); });

                cards.select("title").text(function(d) { return d.pm25; });
                cards.exit().remove();
                //only preserve the first 30 days
                svg.selectAll(".col").filter(function(d){return d._id.day > 30;}).remove();
            }
        });
    }else if($("#showDayOfMonthSeparately" ).is( ':checked' )){
        $.ajax({
            url:"dayTrendsByCodesSeparately.do",
            type:"post",
            data: cities,
            success:function(returnData){
                var data = JSON.parse(returnData);
                var colorScale = d3.scale.linear()
                    .domain([150, 0]).range(colors);
                var groupedData = d3.nest()
                    .key(function(d){return d._id.day;})
                    .key(function(d){return d._id.month;})
                    .entries(data);

                for(var i = 0; i < groupedData.length; i ++){//day
                    if(groupedData[i].values == null)
                        continue;
                    var dayIndex = parseInt(groupedData[i].key)-1;
                    if(dayIndex >= 30)
                        continue;
                    var length = groupedData[i].values.length;
                    for(var j = 0; j < length; j ++){//month
                        var monthIndex = parseInt(groupedData[i].values[j].key) -1;
                        var dataOneRect = groupedData[i].values[j];
                        //将经纬度坐标映射到矩形网格中 mapping latlng to the grid
                        var normalized = normalizeToRect(filteredData, gridWidth, gridHeight);

                        var m = function(code){
                            for(var k = 0; k < dataOneRect.values.length; k ++){
                                if(dataOneRect.values[k]._id.code == code)
                                    return dataOneRect.values[k].pm25;
                            }
                        };
                        //d3.map(dataOneRect, function(d) { return d.code; });

                        var t = [ /* Target variable */ ];
                        var x = normalized.x;
                        var y = normalized.y;
                        for(var k = 0; k < normalized.code.length; k ++){
                            if(m(normalized.code[k]) == null){
                                t.push(0);//TODO
                            }else{
                                t.push(m(normalized.code[k]));
                            }
                        }

                        var model = "exponential";
                        var sigma2 = 0, alpha = 100;
                        var variogram = kriging.train(t, x, y, model, sigma2, alpha);
                        var newValue = [];

                        var id = "onerect"+i+j;
                        var oneRect = svg.append("g")
                            .attr("id", id)
                            .attr("transform", "translate("+ (dayIndex * gridWidth+1) + "," + (monthIndex * gridHeight+1) + ")")
                            .attr("width", gridWidth-1)
                            .attr("height", gridHeight-1);

                        for(var l = 0; l < gridHeight-1; l ++){
                            newValue[l] = [];
                            for(var m = 0; m < gridWidth-1; m ++){
                                newValue[l][m] = kriging.predict(m, l, variogram);
                                oneRect.append("rect")
                                    .attr("width", 1)
                                    .attr("height", 1)
                                    .attr("fill", colorScale(newValue[l][m]))
                                    .attr("transform", "translate(" + m + "," + l + ")");
                            }
                        }
                    }
                }
            }
        });
    }
}

/**
 * customize calendar view by :
 * @param width
 * @param height
 * @param unit1x of x
 * @param unit2x of x
 * @param unit1y of y
 * @param unit2y
 * TODO
 */
function customizeCalendarView(){
    var rows, cols, gridWidth, gridHeight;

    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom,
        colors = ["#FF0000","#FFFF00","00FF00"];

    if($("#showHourOfWeek" ).is( ':checked' )){
        rows = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        cols = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
        gridWidth = Math.floor(width / 24);
        gridHeight = Math.floor(height / 7);
    }

    d3.select("#calendar").selectAll("svg").remove();
    var svg = d3.select("#calendar").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var rowLabels = svg.append("g")
        .selectAll(".rowLabel")
        .data(rows)
        .enter().append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return i * gridHeight; })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + gridHeight / 1.5 + ")")
        .attr("class", function () {return "rowLabel mono axis axis-workweek";});

    var colLabels = svg.append("g")
        .selectAll(".colLabel")
        .data(cols)
        .enter().append("text")
        .text(function(d) { return d; })
        .attr("x", function(d, i) { return i * gridWidth; })
        .attr("y", 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + gridWidth / 2 + ", -6)")
        .attr("class", function() { return "colLabel mono axis axis-worktime"; });

    var cities = "";
    if(filteredData.length != 0){
        cities += ("codes[]="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes[]="+filteredData[i].code);
            }
        }
    }

    if($("#showHourOfWeek" ).is( ':checked' )){
        $.ajax({
            url: "hourOfWeekTrend.do",
            type: "post",
            data: cities,
            success: function (returnData) {
                var data = JSON.parse(returnData);
                var colorScale = d3.scale.linear()
                    .domain([150, 0]).range(colors);

                var cards = svg.append("g")
                    .selectAll(".col")
                    .data(data, function (d) {
                        return d._id.hourofdayjb + ':' + d._id.dayofweekbj;
                    });

                cards.append("title");

                cards.enter()
                    .append("rect")
                    .attr("x", function (d) {
                        return (d._id.hourofdayjb) * gridWidth;
                    })
                    .attr("y", function (d) {
                        return (d._id.dayofweekbj + 5) % 7 * gridHeight;
                    })
                    .attr("class", "col bordered")
                    .attr("width", gridWidth)
                    .attr("height", gridHeight)
                    .style("fill", colors[0]);

                cards.transition().duration(1000)
                    .style("fill", function (d) {
                        return colorScale(d.pm25);
                    });

                cards.select("title").text(function (d) {
                    return d.pm25;
                });
                cards.exit().remove();
            }
        });
    }
}

/**
 * active free draw function
 */
var freedrawEvent = {latLngs:[]};

function activeFreeDraw(){
    freedrawLayer = new L.FreeDraw();
    freedrawLayer.setMode(L.FreeDraw.MODES.ALL);
    map.addLayer(freedrawLayer);
    freedrawLayer.on('mouseup', function recodeMouse(event){

    });
    freedrawLayer.on('markers', function getMarkers(eventData) {
        if(eventData == null || eventData.latLngs.length == 0)
            return;
        freedrawEvent = eventData;
        featureAddedListener();
    });
}

/**
 * deactive free draw function
 */
function deactiveFreeDraw(){
    map.removeLayer(freedrawLayer);
}

/**
 * freedraw以后的事件处理
 * @param event
 */

function featureAddedListener() {
    $("#piemenu").css("visibility", "visible");
    $("#piemenu").css("left", cursorX - 150);
    $("#piemenu").css("top", cursorY - 150);
}

function zoomAndCenter(){
    if(freedrawEvent == null || freedrawEvent.latLngs == null)
        return;//TODO ??
    var event = freedrawEvent;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(event.latLngs));
    $.ajax({
        url:"cities.do",
        type:"post",
        dataType:"json",
        success:function(data){
            var newData = [];
            var i;
            var result;
            for(i = 0; i < data.length; i ++){
                //use leafletpip to calculate whether points are in the bounds
                result = leafletPip.pointInLayer([data[i].longitude, data[i].latitude], bounds, true);
                if(result.length > 0){
                    newData.push(data[i]);
                }
            }
            filteredData = newData;
            buildLocationLayer(newData);
            linearTime();
        }
    });
    $.ajax({
        url:"yearAvg_v2.do",
        type:"post",
        dataType:"json",
        success:function(data){
            var resultData = [];
            var i;
            for(i = 0; i < data.length; i ++){
                //use leafletpip to calculate whether points are in the bounds
                result = leafletPip.pointInLayer([data[i].longitude, data[i].latitude], bounds, true);
                if(result.length > 0){
                    resultData.push(data[i]);
                }
            }
            if($("#hidehm" ).is( ':checked' ))
                buildHM(resultData);
            //调整中心点
            map.fitBounds(L.latLngBounds(event.latLngs));
        }
    });
    $("#piemenu").css("visibility", "hidden");
    //hideHM_Yearly();//TODO ugly structure
    deactiveFreeDraw();//TODO ugly structure
    createCalendarView();//TODO ugly structure
}


/**
 * function
 */
function normalizeToRect(filtered, width, height){
    var result = {x:[], y:[], code:[]};
    var parsed = {x:[], y:[], code:[]};
    filtered.forEach(function forEach(latLng) {
        parsed.x.push(latLng.longitude);
        parsed.y.push(latLng.latitude);
        parsed.code.push(latLng.code);
    });
    var maxX = d3.max(parsed.x);
    var maxY = d3.max(parsed.y);
    var minX = d3.min(parsed.x);
    var minY = d3.min(parsed.y);
    for(var i = 0; i < parsed.x.length; i ++){
        result.x.push(width * (parsed.x[i] - minX) / (maxX - minX));
        result.y.push(height * (parsed.y[i] - minY) / (maxY - minY));
        result.code.push(parsed.code[i]);
    }
    return result;
}

function hideHM_Yearly(){
    map.removeLayer(heatmapLayer);
}

function hmControl(){
    if($("#hmcontrol").is( ':checked' )){
        displayHM_Yearly();
    }else{
        hideHM_Yearly();
    }
}
/**
 * 创建热力图
 */
function displayHM_Yearly(){
    $.ajax({
        url:"yearAvg_v2.do",
        type:"post",
        dataType:"json",
        success:function(data){
            buildHM(data);
        }
    });
}

function buildHM(data){
    var maxValue = 150;
    if(data.length == 0)
        return;
    var transformedData = { max: maxValue , data: [] };
    var length = data.length;

    while(length --){
        transformedData.data.push({
            lat: data[length].latitude,
            lng: data[length].longitude,
            count: data[length].pm25
        });
    }

    if(heatmapLayer != null)
        map.removeLayer(heatmapLayer);
    heatmapLayer = new HeatmapOverlay(cfg);
    map.addLayer(heatmapLayer);
    heatmapLayer.setData(transformedData);

}

function pointControl(){
    paintControl.stations = $("#pointcontrol").is( ':checked' );
    if($("#pointcontrol").is( ':checked' )){
        displayPoints();
    }else{
        hidePoints();
    }
}


function meteorologicalStationControl(){
    paintControl.mstations = $("#meteorologicalStationControl").is( ':checked' );
    if($("#meteorologicalStationControl").is( ':checked' )){
        displayMeteorologicalStations();
    }else{
        hideMeteorologicalStations();
    }
}

function displayMeteorologicalStations(){
    $.ajax({
        url:"meteorologicalStations.do",
        type:"post",
        dataType:"json",
        success:function(data){
            buildMeteorologicalStationLayer(data);
        }
    });
}

function buildMeteorologicalStationLayer(data){
    meteorologicalStationLayer.clearLayers();
    for ( var i = 0; i < data.length; ++i) {
        meteorologicalStationLayer.addLayer(L.circle([data[i].latitude, data[i].longitude], 500, meteorologicalStationOption));
    }

}
function hideMeteorologicalStations(){
    meteorologicalStationLayer.clearLayers();
}

///////////////
function hidePoints(){
    locationLayer.clearLayers();
}
/**
 * 显示所有监测点
 */
function displayPoints(){
    $.ajax({
        url:"cities.do",
        type:"post",
        dataType:"json",
        success:function(data){
            filteredData = data;
            buildLocationLayer(filteredData);
        }
    });
}

/**
 * 创建层
 * @param data
 */
function buildLocationLayer(data){
    locationLayer.clearLayers();
    for ( var i = 0; i < data.length; ++i) {
        locationLayer.addLayer(L.circle([data[i].latitude, data[i].longitude], 500, optPoint));
    }

}


/**
 * 创建线性选择
 */
function linearTime(){
    $("#trend").empty();

    var totalW = $("#trend").width(), totalH = $("#trend").height();
    var margin = {top: 10, right: 10, bottom: 30, left: 40},
        width = totalW - margin.left - margin.right,
        height = totalH - margin.top - margin.bottom;

    var color = d3.scale.category10();

    var svg = d3.select("#trend").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var cities = "";
    if(filteredData.length != 0){
        cities += ("codes[]="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes[]="+filteredData[i].code);
            }
        }
    }

    $.ajax({
        url:"monthTrends_v2.do",
        type:"post",
        data: cities,
        success: function (returnData) {
            var data = JSON.parse(returnData);

            var x = d3.time.scale().range([0, width]),
                y = d3.scale.linear().range([height, 0]);

            var xAxis = d3.svg.axis().scale(x).orient("bottom"),
                yAxis = d3.svg.axis().scale(y).orient("left");

            var brush = d3.svg.brush()
                .x(x)
                .on("brush", brushed)
                .on("brushend", brushend);

            function brushed() {
                //console.log(brush.extent());
                //x.domain(brush.empty() ? x.domain() : brush.extent());
            }
            function brushend(){
                //do not paint when brush doesn't change
                if(overAllBrush != null && overAllBrush[0] == brush.extent()[0] && overAllBrush[1] == brush.extent()[1])
                    return;
                overAllBrush = brush.empty() ? x.domain() : brush.extent();
                repaintAll();
            }

            var line = d3.svg.line()
                .interpolate("monotone")
                .x(function(d) {return x(new Date(d.time)); })
                .y(function(d) { return y(d.pm25); });

            color.domain(d3.keys(data[0]).filter(function (key) {
                return key === "pm25";
            }));

            x.domain(d3.extent(data.map(function (d) {
                return new Date(d.time);
            })));

            //TODO 固定y轴最大数值
            y.domain([0, 150]);

            context.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            context.append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("y", -6)
                .attr("height", height + 7);

            context.append("path")
                .datum(data)
                .attr("class", "line")
                .attr("d", line);
        }
    });


}

/**
 * TODO all repaint should use this function
 */
function repaintAll(){
    //TODO
    createCalendarView();
}
