/**
 * Created by yidu on 11/10/15.
 */

//地图对象
var map;
//谷歌地图与bing地形地图
//var mapLayer,hybridLayer;
//各种叠加图层
var locationLayer, heatmapLayer, freedrawLayer;
//各种过滤控件
var polygonConrtol, navControl,provinceSelectionControl;

var temp;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code

//option of points
var optPoint = {fillColor:'#ee0011', fill:true, color:'#FF0000'};

//var pointMap = [
//    new OpenLayers.Style({'fillColor': "#FF0000"}),
//    new OpenLayers.Style({'fillColor': "#FF1A00"}),
//    new OpenLayers.Style({'fillColor': "#FF3300"}),
//    new OpenLayers.Style({'fillColor': "#FF4C00"}),
//    new OpenLayers.Style({'fillColor': "#FF6600"}),
//    new OpenLayers.Style({'fillColor': "#FF8000"}),
//    new OpenLayers.Style({'fillColor': "#FF9900"}),
//    new OpenLayers.Style({'fillColor': "#FFB200"}),
//    new OpenLayers.Style({'fillColor': "#FFCC00"}),
//    new OpenLayers.Style({'fillColor': "#FFE600"}),
//    new OpenLayers.Style({'fillColor': "#FFFF00"}),
//    new OpenLayers.Style({'fillColor': "#E6FF00"}),
//    new OpenLayers.Style({'fillColor': "#CCFF00"}),
//    new OpenLayers.Style({'fillColor': "#B2FF00"}),
//    new OpenLayers.Style({'fillColor': "#99FF00"}),
//    new OpenLayers.Style({'fillColor': "#80FF00"}),
//    new OpenLayers.Style({'fillColor': "#66FF00"}),
//    new OpenLayers.Style({'fillColor': "#4DFF00"}),
//    new OpenLayers.Style({'fillColor': "#33FF00"}),
//    new OpenLayers.Style({'fillColor': "#19FF00"}),
//    new OpenLayers.Style({'fillColor': "#00FF00"})];

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
    //$('#map').css("width", window.screen.availWidth).css("height", window.screen.availHeight);
    $('#map').css("width", "800").css("height", "600px");
    L.mapbox.accessToken = 'pk.eyJ1Ijoic3Vuc25vd2FkIiwiYSI6ImNpZ3R4ejU3ODA5dm91OG0xN2d2ZmUyYmIifQ.jgzNI617vX6h48r0_mRzig';
    map = L.mapbox.map('map', 'mapbox.streets')
        .setView([38.0121105, 105.6670345], 5);

    //add location layer
    locationLayer = L.layerGroup();
    locationLayer.addTo(map);

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


}

/**
 * init calendar view
 * @param type 1 means hour of week; 2 means day of month
 */
function initCalendarView(type){

    if(type == 2){
        createDayOfMonthCalendarView();
    }else if(type == 1){
        //TODO
    }

}

function createDayOfMonthCalendarView(){
    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom,
        gridWidth = Math.floor(width / 30),
        gridHeight = Math.floor(height / 12),
        //legendElementWidth = gridSize*2,
        buckets = 9,
        colors = ["#FF0000","#FF1A00","#FF3300","#FF4C00","#FF6600","#FF8000","#FF9900","#FFB200","#FFCC00","#FFE600","#FFFF00","#E6FF00","#CCFF00","#B2FF00"],
        rows = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        cols = [];
        //days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        //times = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
    for(var i = 1; i <= 30; i ++){
        cols.push(i);
    }
    d3.select("#calendar").selectAll("svg").remove();
    var svg = d3.select("#calendar").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var rowLabels = svg.selectAll(".rowLabel")
        .data(rows)
        .enter().append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return i * gridHeight; })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + gridHeight / 1.5 + ")")
        .attr("class", function (d, i) {return "rowLabel mono axis axis-workweek";});

    var colLabels = svg.selectAll(".colLabel")
        .data(cols)
        .enter().append("text")
        .text(function(d) { return d; })
        .attr("x", function(d, i) { return i * gridWidth; })
        .attr("y", 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + gridWidth / 2 + ", -6)")
        .attr("class", function(d, i) { return "colLabel mono axis axis-worktime"; });

    var cities = "";
    if(filteredData.length != 0){
        cities += ("?codes[]="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes[]="+filteredData[i].code);
            }
        }
    }

    d3.json("dayTrendsByCodes_v2.do"+cities,//TODO filter and post
        function(error, data) {
            var colorScale = d3.scale.quantile()
                .domain([0, buckets - 1, d3.max(data, function (d) { return d.pm25; })])
                .range(colors);

            var cards = svg.selectAll(".col")
                .data(data, function(d) {
                    return d._id.day+':'+d._id.month;});

            cards.append("title");

            cards.enter()
                .append("rect")
                .attr("x", function(d) {return (d._id.day - 1) * gridWidth; })
                .attr("y", function(d) { return (d._id.month - 1) * gridHeight; })
                .attr("rx", 3)
                .attr("ry", 3)
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


        });
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
            buildHM(resultData);
            //调整中心点
            map.fitBounds(L.latLngBounds(event.latLngs));
        }
    });
    $("#piemenu").css("visibility", "hidden");
    createDayOfMonthCalendarView();//TODO ugly structure
    deactiveFreeDraw();//TODO ugly structure
    hideHM_Yearly();//TODO ugly structure
}

function hideHM_Yearly(){
    map.removeLayer(heatmapLayer);
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
    console.log("build location layer");
    locationLayer.clearLayers();
    for ( var i = 0; i < data.length; ++i) {
        locationLayer.addLayer(L.circle([data[i].latitude, data[i].longitude], 500, optPoint));
    }

}


/**
 * 创建线性选择
 */
function linearTime(){
    $("#detailTrendsContext").empty();
    var totalW = 900, totalH = 200;
    //1为上面那个 2为下面那个
    var margin = {top: 10, right: 10, bottom: 100, left: 40},
        margin2 = {top: totalH-70, right: 10, bottom: 40, left: 40},
        width = totalW - margin.left - margin.right,
        height = totalH - margin.top - margin.bottom,
        height2 = totalH - margin2.top - margin2.bottom;

    //var parseDate = d3.time.format("%Y-%m").parse;
    var color = d3.scale.category10();

    var x = d3.time.scale().range([0, width]),
        x2 = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]),
        y2 = d3.scale.linear().range([height2, 0]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var brush = d3.svg.brush()
        .x(x2)
        .on("brush", brushed);

    var line = d3.svg.line()
        //.interpolate("monotone")
        .x(function(d) {return x(new Date(d.time)); })
        .y(function(d) { return y(d.avg_time); });

    var line2 = d3.svg.line()
        .interpolate("monotone")
        .x(function(d) { return x2(new Date(d.time)); })
        .y(function(d) { return y2(d.avg_time); });

    var svg = d3.select("#detailTrendsContext").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + margin2.left + "," + 0 + ")");

    var cities = "";
    if(filteredData.length != 0){
        cities += ("?codes="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes="+filteredData[i].code);
            }
        }
    }
    d3.json("monthTrends_v2.do"+cities, function(error, data) {
        color.domain(d3.keys(data[0]).filter(function(key) {
            return key === "pm25";
        }));
        //检测指标
        var attrs = color.domain().map(function(name) {
            return {
                name: name,
                values: data.map(function(d) {
                    return {time: d.time, avg_time: +d[name]};
                })
            };
        });

        x.domain(d3.extent(data.map(function(d) {  return new Date(d.time); })));
        //固定y轴最大数值
        y.domain([0, d3.max(data.map(function(d) { return 150; }))]);//d.avg_time; }))]);
        x2.domain(x.domain());
        y2.domain(y.domain());


        focus.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        focus.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        var attr1 = focus.selectAll(".attr")
            .data(attrs)
            .enter().append("g")
            .attr("class", "attr");

        attr1.append("path")
            .attr("class", "line")
            .attr("clip-path", "url(#clip)")
            .attr("d", function(d) {return line(d.values); })
            .style("stroke", function(d) {return color(d.name); });

        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2)
            .append("text")
            .attr("x", 450)
            .attr("y", 25)
            .style("text-anchor", "middle")
            .text("Date");

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", height2 + 7);

        var attr2 = context.selectAll(".attr")
            .data(attrs)
            .enter().append("g")
            .attr("class", "attr");

        attr2.append("path")
            .attr("class", "line")
            .attr("d", function(d) { return line2(d.values); })
            .style("stroke", function(d) { return color(d.name); });

        var legendItem = legend.selectAll('.attr')
            .data(attrs.map(function(d) { return d.name; }))
            .enter().append("g")
            .attr("transform", function(d, i) { return "translate(0," + i*18 + ")"; })
            .attr("class", "attr legend");

        legendItem.append("rect")
            .attr("width", 13)
            .attr("height", 13)
            .attr("fill", function(d) { return color(d); });

        legendItem.append("text")
            .attr("x", 15)
            .attr("y", 10.5)
            .text(function(d) { return d; });
    });

    function brushed() {
        x.domain(brush.empty() ? x2.domain() : brush.extent());
        focus.selectAll(".attr").selectAll("path")
            .transition()
            .attr("d", function(d) {return line(d.values); });
        focus.select(".x.axis").call(xAxis);
    }
}

/**
 * 根据brush的粒度，呈现detail
 */
function linearTimeDetail(){
    $("#detailTrendsFocus").empty();
    var totalW = 900, totalH = 300;
    //1为上面那个 2为下面那个
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = totalW - margin.left - margin.right,
        height = totalH - margin.top - margin.bottom;

    var parseDate = d3.time.format("%Y-%m").parse;
    var color = d3.scale.category10();

    var x = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var line = d3.svg.line()
        .interpolate("monotone")
        .x(function(d) {return x(parseDate(d.time_point)); })
        .y(function(d) { return y(d.avg_time); });

    var svg = d3.select("#detailTrendsFocus").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var cities = "";
    if(filteredData.length != 0){
        cities += ("?codes="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes="+filteredData[i].code);
            }
        }
    }

    d3.json("monthTrends.do"+cities, function(error, data) {
        color.domain(d3.keys(data[0]).filter(function(key) {
            return key === "avg_time";
        }));
        //检测指标
        var attrs = color.domain().map(function(name) {
            return {
                name: name,
                values: data.map(function(d) {
                    return {time_point: d.time_point, avg_time: +d[name]};
                })
            };
        });

        x.domain(d3.extent(data.map(function(d) {  return parseDate(d.time_point); })));
        //固定y轴最大数值
        y.domain([0, d3.max(data.map(function(d) { return 150; }))]);//d.avg_time; }))]);
        focus.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        focus.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        var attr1 = focus.selectAll(".attr")
            .data(attrs)
            .enter().append("g")
            .attr("class", "attr");

        attr1.append("path")
            .attr("class", "line")
            .attr("clip-path", "url(#clip)")
            .attr("d", function(d) {return line(d.values); })
            .style("stroke", function(d) {return color(d.name); });

        var legendItem = legend.selectAll('.attr')
            .data(attrs.map(function(d) { return d.name; }))
            .enter().append("g")
            .attr("transform", function(d, i) { return "translate(0," + i*18 + ")"; })
            .attr("class", "attr legend");

        legendItem.append("rect")
            .attr("width", 13)
            .attr("height", 13)
            .attr("fill", function(d) { return color(d); });

        legendItem.append("text")
            .attr("x", 15)
            .attr("y", 10.5)
            .text(function(d) { return d; });
    });
}

/**
 * 日历详细趋势图
 * 周期性选择
 */
function cycleTime(){
    $("#detailTrendsCycle").empty();
    $("#detailTrendsCycle").html("<div id=\"monthAvg\"></div><div id=\"monthDetail\"></div>");
//    createMonthAvg();
    createMonthDetail();

}

/**
 * 创建月平均图
 */
function createMonthAvg(){
    var width = 900,
        height = 17,
        cellSize = 17; // cell size

    var day = d3.time.format("%w"),
        week = d3.time.format("%U"),
        monthd = d3.time.format("%m"),
        format = d3.time.format("%Y-%m-%d");

    var color = d3.scale.quantize()
        .domain([150, 0])
        .range(d3.range(20).map(function(d) { return "r" + d + "-11"; }));

    var svg = d3.select("#monthAvg").selectAll("svg")
        .data(d3.range(2014, 2015))
        .enter().append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "RdYlGn")
        .append("g")
        .attr("transform", "translate(" + 1 + "," + 0 + ")");

//    var px = 0;
//    //绘制月平均
//    svg.selectAll(".day")
//        .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
//        .enter().append("rect")
//        .attr("class", "monthAvg")
//        .attr("width", function(t0) {
//            var  t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
//                w0 = +week(t0), w1 = +week(t1);
//            return (w1-w0)* cellSize; })
//        .attr("height", cellSize)
//        .attr("x", function(t0) {
//            var  w0 = +week(t0);
//            return (w0)* cellSize; })
//        .attr("y", 0)
//        .datum(format);
    var month = svg.selectAll(".monthAvg")
        .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "monthAvg")
        .attr("d", monthPath);
//        .attr("fill",monthAvgColor);

    d3.json("monthTrends.do", function(error, json) {
        var data = d3.nest()
            .key(function(d) { return d.time_point; })
            .rollup(function(d) { return d[0].avg_time; })
            .map(json);

        month.filter(function(d) { return d in json; })
            .attr("fill", function(d) {
//                console.log(d+":"+monthd(d.time_point));
                return color2[monthd(d.time_point)];
            })
            .select("title")
            .text(function(d) { return d + ": " + d3.round(data[d]); });
    });

    function monthPath(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = +day(t0), w0 = +week(t0),
            d1 = +day(t1), w1 = +week(t1);
//        console.log("t:"+t0+"\n"+t1);
//        console.log("d:"+d0+"\n"+d1);
//        console.log("w:"+w0+"\n"+w1);
        return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
            + "H" + w0 * cellSize + "V" + cellSize
            + "H" + w1 * cellSize + "V" + cellSize
            + "H" + (w1 + 1) * cellSize + "V" + 0
            + "H" + (w0 + 1) * cellSize + "Z";
    }

//    d3.select(self.frameElement).style("height", "500px");
}

/**
 *
 * modified by yidu at Purdue
 */
function createMonthDetail(){
    var width = 910,
        height = 136,
        cellSize = 17; // cell size

    var day = d3.time.format("%w"),
        week = d3.time.format("%U"),
//        percent = d3.format("4d"),
        format = d3.time.format("%Y-%m-%d");

    var color = d3.scale.quantize()
        .domain([150, 0])
        .range(d3.range(20).map(function(d) {
            return "r" + d + "-11"; }));

    var svg = d3.select("#monthDetail").selectAll("svg")
        .data(d3.range(2014, 2015))
        .enter().append("svg")
        .attr("width", width)
        .attr("height", height+cellSize)
        .attr("class", "RdYlGn")
        .append("g")
        .attr("transform", "translate(" + 1 + "," + 0 + ")");

    var rect = svg.selectAll(".day")
        .data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) {return week(d) * cellSize; })
        .attr("y", function(d) {return day(d) * cellSize ; })
        .datum(format);

    rect.append("title")
        .text(function(d) { return d; });

    svg.selectAll(".month")
        .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    d3.json("dayTrendsByCodes_v2.do", function(error, json) {
        var data = d3.nest()
            .key(function(d) { return format(new Date(d.time)); })//TODO 时区的问题
            .rollup(function(d) { return d[0].pm25; })
            .map(json);

        rect.filter(function(d) {return d in data; })
            .attr("class", function(d) {return "day " + color(data[d]); })
            .select("title")
            .text(function(d) { return d + ": " + d3.round(data[d]); });
    });

    function monthPath(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = +day(t0), w0 = +week(t0),
            d1 = +day(t1), w1 = +week(t1);
        return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
            + "H" + w0 * cellSize + "V" + 7 * cellSize
            + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
            + "H" + (w1 + 1) * cellSize + "V" + 0
            + "H" + (w0 + 1) * cellSize + "Z";
    }
}

/**
 * 经纬度数据归一化
 * @param data
 * @returns {*}
 */
function nomizedData(data){
    // var d = [];
    var i = 0;
    var minLat = 180, minLon = 180;
    var maxLat = 0, maxLon = 0;
    for(i = 0; i < data.length; i++){
        if(data[i].lat > maxLat)
            maxLat = data[i].lat;
        if(data[i].lon > maxLon)
            maxLon = data[i].lon;
        if(data[i].lat < minLat)
            minLat = data[i].lat;
        if(data[i].lon < minLon)
            minLon = data[i].lon;
    }
    var maxInterval = ((maxLon - minLon) > (maxLat - maxLat)) ? (maxLon - minLon) : (maxLat - minLat);
    for(i = 0; i < data.length; i ++){
        data[i].lat = data[i].lat/maxInterval;
        data[i].lon = data[i].lon/maxInterval;
    }
    return data;
}

/**
 * 计算经纬度的最小间隔
 * @param data
 * @returns {*[]}
 */
function minInterval(data){
    var i,j;
    var minIntervalLat = 100, minIntervalLon = 100;
    for(i = 0; i < data.length; i ++){
        for(j = 1; i < data.length; j ++){
            if(minIntervalLat < Math.abs(data[i].lat - data[j].lat))
                minIntervalLat = Math.abs(data[i].lat - data[j].lat);
            if(minIntervalLon < Math.abs(data[i].lon - data[j].lon))
                minIntervalLon = Math.abs(data[i].lon - data[j].lon);
        }
    }
    return [minIntervalLat, minIntervalLon];

}

//todo：可以通过滑动条控制hm的显示
function createBasicHMCalenar(){
}
