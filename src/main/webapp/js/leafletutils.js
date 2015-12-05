/**
 * Created by yidu on 11/10/15.
 */

//地图对象
var map;

//各种叠加图层
var locationLayer, freedrawLayer, meteorologicalStationLayer;
var provinceBoundaryOverlay, cityBoundaryOverlay;
var provinceValueOverlay, cityValueOverlay;

var overAllBrush;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code
var paintControl = {
    calendar        :   false,
    calendarType    :   1,//0dayofmonth
    trend           :   false,
    stations        :   false,
    mstations       :   false
};

//option of points
var optPoint = {fillColor:'#ee0011', fill:true, color:'#FF0000'};
// option of meteorological station
var meteorologicalStationOption = {fillColor:'#00ee11', fill:true, color:'#0000FF'};

var cursorX;
var cursorY;
document.onmousemove = function(e){
    cursorX = e.pageX;
    cursorY = e.pageY;
}
var piemenu;

/**
 * active free draw function
 */
var freedrawEvent = {latLngs:[]};
var realRatio = 1;
var CALENDAR_WIDTH_DEFAULT = 800;
var CALENDAR_HEIGHT_DEFAULT = 600;

//overall color scale
var colors = ["#FF0000","#FFFF00","00FF00"]
var colorScale = d3.scale.linear().domain([150, 0]).range(colors);

function initUIs(){
    $('#map').css("width", window.screen.availWidth).css("height", window.screen.availHeight);
    L.mapbox.accessToken = 'pk.eyJ1Ijoic3Vuc25vd2FkIiwiYSI6ImNpZ3R4ejU3ODA5dm91OG0xN2d2ZmUyYmIifQ.jgzNI617vX6h48r0_mRzig';
    map = L.mapbox.map('map', 'mapbox.streets')
        .setView([38.0121105, 105.6670345], 4);
    map.options.minZoom = 4;

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

    piemenu.createWheel(['zoom']);//, 'group', 'ungroup', 'factors', 'factors with wind', 'nearby']);
    piemenu.navItems[0].navigateFunction = zoomAndCenter;
    //TODO
    piemenu.wheelRadius = 50;
}

function createChinamap(){
    var provinces = [];
    provinceBoundaryOverlay = L.d3SvgOverlay(function(sel, proj) {
        var upd = sel.selectAll('path').data(provinces);
        upd.enter()
            .append('path')
            .attr('d', proj.pathFromGeojson)
            .attr('stroke', 'black')
            .attr('fill-opacity', '0');
        upd.attr('stroke-width', 1 / proj.scale);
    });

    d3.json("maps/china_provinces.json",
        function (data) {
            provinces = data.features;
            provinceBoundaryOverlay.addTo(map)
        }
    );
}

function createProvinceValue(){

    var provinces = [];
    provinceValueOverlay = L.d3SvgOverlay(function(sel, proj) {

        var upd = sel.selectAll('path').data(provinces);
        upd.enter()
            .append('path')
            .attr('d', proj.pathFromGeojson)
            //.attr('stroke', 'black')
            .attr("fill", function(d){
                return colorScale(d.pm25);
            })
            .attr('fill-opacity', '0.7');
        //upd.attr('stroke-width', 1 / proj.scale);

    });

    var cities = "";
    if(overAllBrush != null){
        cities += "startTime="+overAllBrush[0] +"&endTime="+overAllBrush[1];
    }
    $.ajax({
        url: "valueByProvinces.do",
        type: "post",
        data: cities,
        success: function (resultData) {
            var result = JSON.parse(resultData);
            var findValue = function(proName){
                for(var i = 0; i < result.length; i ++){
                    if(result[i]._id == proName)
                        return result[i].pm25;
                }
            };

            d3.json("maps/china_provinces.json",
                function (data) {
                    provinces = data.features;
                    for(var i = 0; i < provinces.length; i ++){
                        provinces[i].pm25 = findValue(provinces[i].properties.name);
                    }
                    provinceValueOverlay.addTo(map)
                }
            );
        }
    });

}

function createCityMap(){
    var cities = [];
    cityBoundaryOverlay = L.d3SvgOverlay(function(sel, proj) {

        var upd = sel.selectAll('path').data(cities);
        upd.enter()
            .append('path')
            .attr('d', proj.pathFromGeojson)
            .attr('stroke', 'black')
            .attr('fill', function(d){
                console.log(d);
                return d3.hsl(Math.random() * 360, 0.9, 0.5)
            })
            .attr('fill-opacity', '0');
        upd.attr('stroke-width', 0.5 / proj.scale);
    });

    d3.json("maps/china_cities.json", function(data) { cities = data.features; cityBoundaryOverlay.addTo(map) });

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
function buildMeteorologicalStationLayer(data){
    meteorologicalStationLayer.clearLayers();
    for ( var i = 0; i < data.length; ++i) {
        meteorologicalStationLayer.addLayer(L.circle([data[i].latitude, data[i].longitude], 500, meteorologicalStationOption));
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
    var marginCalendar = { top: 50, right: 0, bottom: 0, left: 30 };
    var width = CALENDAR_WIDTH_DEFAULT - marginCalendar.left - marginCalendar.right,
        height = CALENDAR_HEIGHT_DEFAULT - marginCalendar.top - marginCalendar.bottom;

    if($("#showHourOfWeek" ).is( ':checked' ) || $("#showHourOfWeekSeparately" ).is( ':checked' ) ){
        rows = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        cols = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
        gridWidth = Math.floor(width / 24);
        gridHeight = Math.floor(height / 7);
    }else if($("#showDayOfMonth" ).is( ':checked' )){
        gridWidth = Math.floor(width / 30);
        gridHeight = Math.floor(height / 12);
        rows = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        cols = [];

        for(var i = 1; i <= 30; i ++){
            cols.push(i);
        }
    }else if($("#showDayOfMonthSeparately" ).is( ':checked' )){
        if(overAllBrush == null){
            //TODO overall Brush is null
        }else{
            var startMonth = overAllBrush[0].getMonth();
            var endMonth = overAllBrush[1].getMonth();
            var rowCount = endMonth - startMonth + 1;
            var colCount = 30;
            if(startMonth == endMonth){
                colCount = overAllBrush[1].getDate() - overAllBrush[0].getDate() + 1;
            }
            //自适应计算宽度高度
            var t1 = width / (colCount * realRatio);
            var t2 = height / (rowCount);
            if(t1 < t2){
                width = width;
                height = (width / realRatio)*rowCount/colCount ;
                $("#calendar").width(width + marginCalendar.left + marginCalendar.right);
                $("#calendar").height(height + marginCalendar.top + marginCalendar.bottom);
                gridWidth = width / colCount ;
                gridHeight = gridWidth / realRatio;
            }else {
                height = CALENDAR_HEIGHT_DEFAULT - marginCalendar.top - marginCalendar.bottom;
                width = (height * realRatio) * colCount / rowCount ;
                $("#calendar").width(width + marginCalendar.left + marginCalendar.right);
                $("#calendar").height(height + marginCalendar.top + marginCalendar.bottom);
                gridHeight = height / rowCount;
                gridWidth = gridHeight * realRatio;
            }
            var rowsTotal = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            cols = [];
            rows = [];
            for(var i = 0 ; i < rowCount; i ++){
                rows.push(rowsTotal[(overAllBrush[0].getMonth() + i) % 12]);
            }
            if(rowCount == 1){
                for (var i = overAllBrush[0].getDate(); i <= overAllBrush[1].getDate(); i++) {
                    cols.push(i);
                }
            }else {
                for (var i = 1; i <= 30; i++) {
                    cols.push(i);
                }
            }
        }

    }

    d3.select("#calendar").selectAll("svg").remove();
    var svg = d3.select("#calendar").append("svg")
        .attr("width", width + marginCalendar.left + marginCalendar.right)
        .attr("height", height + marginCalendar.top + marginCalendar.bottom)
        .append("g")
        .attr("transform", "translate(" + marginCalendar.left + "," + marginCalendar.top + ")");

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
        var dailyHeight = 5;
        $.ajax({
            url:"dayTrendsByCodesSeparately.do",
            type:"post",
            data: cities,
            success:function(returnData){
                var data = JSON.parse(returnData);
                $.ajax({
                    url: "dayTrendsByCodes_v2.do",
                    type: "post",
                    data: cities,
                    success: function (unseparatedData) {
                        var dailyData = JSON.parse(unseparatedData);
                        var colorScale = d3.scale.linear()
                            .domain([150, 0]).range(colors);

                        var cards = svg.append("g")
                            .selectAll(".col")
                            .data(dailyData, function(d) {
                                return d._id.day+':'+d._id.month;});

                        //如果为一个月,则x的偏移变化不同于多个月
                        if(overAllBrush[1].getMonth() == overAllBrush[0].getMonth()){
                            cards.enter()
                                .append("rect")
                                .attr("x", function (d) {
                                    return (d._id.day - overAllBrush[0].getDate() - 1) * gridWidth;
                                })
                                .attr("y", function (d) {
                                    return (d._id.month - overAllBrush[0].getMonth() - 1) * gridHeight;
                                })
                                .attr("class", "col")
                                .attr("width", gridWidth)
                                .attr("height", dailyHeight)
                                .style("fill", colors[0]);
                        }else {
                            cards.enter()
                                .append("rect")
                                .attr("x", function (d) {
                                    return (d._id.day - 1) * gridWidth;
                                })
                                .attr("y", function (d) {
                                    return (d._id.month - overAllBrush[0].getMonth() - 1) * gridHeight;
                                })
                                .attr("class", "col")
                                .attr("width", gridWidth)
                                .attr("height", dailyHeight)
                                .style("fill", colors[0]);
                        }

                        cards.transition().duration(1000)
                            .style("fill", function(d) { return colorScale(d.pm25); });

                        cards.select("title").text(function(d) { return d.pm25; });
                        cards.exit().remove();
                        //only preserve the first 30 days
                        svg.selectAll(".col").filter(function(d){return d._id.day > 30;}).remove();
                        ///////////////

                        var oneRectHeight = gridHeight - dailyHeight;
                        var minTime = d3.min(data, function (d) {
                            return d.time;
                        });
                        var maxTime = d3.max(data, function (d) {
                            return d.time;
                        });

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
                                var normalized = normalizeToRect(filteredData, gridWidth, oneRectHeight);

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
                                var oneRect;
                                if(overAllBrush[1].getMonth() == overAllBrush[0].getMonth()){
                                    oneRect = svg.append("g")
                                        .attr("id", id)
                                        .attr("transform", "translate("+ ((dayIndex - overAllBrush[0].getDate()) * gridWidth+1) + "," + ((monthIndex - overAllBrush[0].getMonth()) * gridHeight+1+dailyHeight) + ")")
                                        .attr("width", gridWidth-1)
                                        .attr("height", oneRectHeight-1);
                                }else{
                                    oneRect = svg.append("g")
                                    .attr("id", id)
                                    .attr("transform", "translate("+ (dayIndex * gridWidth+1) + "," + ((monthIndex - overAllBrush[0].getMonth()) * gridHeight+1+dailyHeight) + ")")
                                    .attr("width", gridWidth-1)
                                    .attr("height", oneRectHeight-1);
                                }
                                for(var l = 0; l < oneRectHeight-1; l ++){
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
        });

    }
}


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

    var width = bounds.getBounds().getNorthWest().distanceTo(bounds.getBounds().getNorthEast());
    var height = bounds.getBounds().getNorthWest().distanceTo(bounds.getBounds().getSouthWest());
    realRatio = width / height;

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
            //调整中心点
            map.fitBounds(L.latLngBounds(event.latLngs));
        }
    });
    $("#piemenu").css("visibility", "hidden");
    //deactiveFreeDraw();//TODO ugly structure
    createCalendarView();//TODO ugly structure
}


/**
 * function
 */
function normalizeToRect(filtered, width, height){
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));

    var result = {x:[], y:[], code:[]};
    var parsed = {x:[], y:[], code:[]};
    filtered.forEach(function forEach(latLng) {
        parsed.x.push(latLng.longitude);
        parsed.y.push(latLng.latitude);
        parsed.code.push(latLng.code);
    });

    var maxX = bounds.getBounds().getNorthEast().lng;
    var maxY = bounds.getBounds().getNorthEast().lat;
    var minX = bounds.getBounds().getNorthWest().lng;
    var minY = bounds.getBounds().getSouthEast().lat;


    for(var i = 0; i < parsed.x.length; i ++){
        result.x.push(width * (parsed.x[i] - minX) / (maxX - minX));
        result.y.push(height * (parsed.y[i] - minY) / (maxY - minY));
        result.code.push(parsed.code[i]);
    }
    return result;
}


/**
 * 创建线性选择
 */
function linearTime(){
    $("#trend").empty();
    $("#trend").width(window.screen.availWidth);
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
    provinceValueControl();
}

/////////Followings are controller to control the visibility of layers//////
//下面是控制各种层显示与否的方法


/**
 * control the visiliblity of calendar
 */
function controlCalendar(){

    paintControl.calendar = $("#controlCalendar").is( ':checked' );
    if($("#controlCalendar").is( ':checked' )){
        disableCalendarView();
        $("#calendar").show();
        $("#calendar").css("visibility", "visible");
    }else{
        enableCalendarView();
        $("#calendar").hide();
    }
}
//TODO
function disableCalendarView(){

}
//TODO
function enableCalendarView(){

}

/**
 * control the visibility of trends
 */
function controlTrend(){
    paintControl.trend = $("#controlTrend").is( ':checked' );
    if($("#controlTrend").is( ':checked' )){
        $("#trendpanel").show();
        $("#trendpanel").css("visibility", "visible");
    }else{
        $("#trendpanel").hide();
    }
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

function provinceBoundaryControl(){
    if($("#provinceBoundary").is( ':checked' )){
        createChinamap();
    }else{
        map.removeLayer(provinceBoundaryOverlay);
    }
}

function provinceValueControl(){
    if($("#provinceValue").is( ':checked' )){
        if(provinceValueOverlay != null)
            map.removeLayer(provinceValueOverlay);
        createProvinceValue();
    }else{
        map.removeLayer(provinceValueOverlay);
    }
}


function cityBoundaryControl(){
    if($("#cityBoundary").is( ':checked' )){
        createCityMap();
    }else{
        map.removeLayer(cityBoundaryOverlay);
    }
}

function hideMeteorologicalStations(){
    meteorologicalStationLayer.clearLayers();
}

function hidePoints(){
    locationLayer.clearLayers();
}

