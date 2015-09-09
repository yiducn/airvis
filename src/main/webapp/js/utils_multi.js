/**
 * Created by cnic on 2015/1/9.
 */

//地图对象
var map1,map2;
var mapid = ["map1","map2"];
var map = [map1, map2];
//谷歌地图与bing地形地图
var mapLayer,hybridLayer;
//各种叠加图层
var locationLayer, heatmapLayer, polygonLayer;
//各种过滤控件
var polygonConrtol, navControl;

var temp;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code
var apiKey = "AqTGBsziZHIJYYxgivLBf0hVdrAk9mWO5cQcb8Yux8sW5M8c8opEC2lZqKR1ZZXf";

function initUIs(){
    initMap(0);
    initMap(1);

//    createPolygonControl();
}

function initMap(id){
    mapLayer = new OpenLayers.Layer.Google(
        "Google Physical", // the default
        {numZoomLevels: 20}
    );
//    hybridLayer = new OpenLayers.Layer.Bing({
//        name: "Hybrid",
//        key: apiKey,
//        type: "AerialWithLabels"
//    });

    map[id] = new OpenLayers.Map(mapid[id], {
        projection: 'EPSG:4326',
//        layers: [hybridLayer,mapLayer],
        layers: [mapLayer],
        center: new OpenLayers.LonLat(105.6670345, 38.0121105)
            .transform('EPSG:4326', 'EPSG:900913'),
        zoom: 4
    });

    heatmapLayer = new OpenLayers.Layer.Heatmap( "heatmap", map[id], mapLayer,
        {
            opacity:80,
            radius:20,
            gradient: {0.45: "rgb(0,0,255)", 0.55: "rgb(0,255,255)", 0.65: "rgb(0,255,0)", 0.95: "yellow", 1.0: "rgb(255,0,0)"},
            projection:"EPSG:900913"
        }, {
            visible: true,
            isBaseLayer: false,
            alwaysInRange : true,
            projection:"EPSG:900913"
        });
    heatmapLayer.projection = "EPSG:900913";

    map[id].addLayers([heatmapLayer]);

    locationLayer = new OpenLayers.Layer.Vector('location');
    var features = [];
    locationLayer.addFeatures(features);
    var vector_style = new OpenLayers.Style({
        'fillColor': '#ee0011',
        'fillOpacity': .8,
        'strokeColor': '#aaee77',
        'strokeWidth': 1,
        'pointRadius': 4
    });
    var vector_style_map = new OpenLayers.StyleMap({
        'default': vector_style
    });
    locationLayer.styleMap = vector_style_map;
    map[id].addLayer(locationLayer);
}

/**
 * 激活多边形选择控件
 */
function activePolygonConrtol(){
    polygonConrtol.activate();
}
/**
 * 取消激活多边形选择控件
 */
function activeNavControl(){
    polygonConrtol.deactivate();
}

function createPolygonControl(){
    polygonLayer = new OpenLayers.Layer.Vector("Polygon Layer", {
       eventListeners: {
            "featureadded": featureAddedListener,
           "sketchstarted":sketchStartedListener
        }
    });
    map.addLayer(polygonLayer);
    map.addControl(new OpenLayers.Control.MousePosition());
    polygonConrtol = new OpenLayers.Control.DrawFeature(polygonLayer,
        OpenLayers.Handler.Polygon)
    map.addControl(polygonConrtol);
}
function sketchStartedListener(event){
    polygonLayer.removeAllFeatures();
}

/**
 * 多边形添加以后的事件处理
 * @param event
 */
function featureAddedListener(event){
    var epsg4326 = new OpenLayers.Projection("EPSG:4326"); //WGS 1984 projection
    var projectTo = map.getProjectionObject(); //The map projection (Spherical Mercator)
    var epsg900913 = new OpenLayers.Projection("EPSG:900913");
    $.ajax({
        url:"cities.do",
        type:"post",
        dataType:"json",
        success:function(data){
            var newData = [];
            var i;
            for(i = 0; i < data.length; i ++){
                //坐标点转换
                if(event.feature.geometry.containsPoint(
                    new OpenLayers.Geometry.Point(data[i].lon,data[i].lat).transform(epsg4326, projectTo))) {
                    newData.push(data[i]);
                }
            }
            filteredData = newData;
            buildLocationLayer(newData);
            paintTrends();
        }
    });
    $.ajax({
        url:"yearAvg.do",
        type:"post",
        dataType:"json",
        success:function(data){
            var newData = {};
            newData.max = data.max;
            newData.data = [];
            var i;
            for(i = 0; i < data.data.length; i ++){
                //坐标点转换
                if(event.feature.geometry.containsPoint(
                    new OpenLayers.Geometry.Point(data.data[i].longitude,data.data[i].latitude).transform(epsg4326, projectTo))) {
                    newData.data.push(data.data[i]);
                }
            }
            temp= newData;
            buildHM(newData);
            //调整中心点
            map.zoomToExtent(event.feature.geometry.getBounds(), true);
        }
    });

}
/**
 * 创建热力图
 */
function displayHM_Yearly(){
    $.ajax({
        url:"yearAvg.do",
        type:"post",
        dataType:"json",
        success:function(data){
            buildHM(data);
        }
    });
}

function buildHM(data){
    if(data.data.length == 0)
        return;
    var transformedData = { max: data.max , data: [] };
    var length = data.data.length;

    while(length --){
        transformedData.data.push({
            lonlat: new OpenLayers.LonLat(data.data[length].longitude, data.data[length].latitude).
            transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
            count: data.data[length].pm25_ave
        });
    }
    heatmapLayer.setDataSet(transformedData);
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
    locationLayer.removeAllFeatures();
    var features = [];
    for ( var i = 0; i < data.length; ++i) {
        features.push(new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(data[i].lon,data[i].lat).
                    transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject())
            )
        );
    }
    locationLayer.addFeatures(features);

}

/**
 * 初始化趋势
 */
function paintTrends(){
    $("#trends").empty();
    var totalW = 1800, totalH = 250;
    //1为上面那个 2为下面那个
    var margin = {top: 10, right: 10, bottom: 100, left: 40},
    margin2 = {top: totalH-70, right: 10, bottom: 20, left: 40},
    width = totalW - margin.left - margin.right,
    height = totalH - margin.top - margin.bottom,
    height2 = totalH - margin2.top - margin2.bottom;

    var parseDate = d3.time.format("%Y-%m").parse;

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

    var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) {return x(parseDate(d.time_point)); })
    .y0(height)
    .y1(function(d) { return y(d.avg_time); });

    var area2 = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x2(parseDate(d.time_point)); })
    .y0(height2)
    .y1(function(d) { return y2(d.avg_time); });

    var svg = d3.select("#trends").append("svg")
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

//    var tip = d3.tip()
//        .attr('class', 'd3-tip')
//        .offset([-10, 0])
//        .html(function(d) {
//            return "<strong>Frequency:</strong> <span style='color:red'>" + "hello" + "</span>";
//        });

    var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

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
//    console.log("codes:"+cities);

    d3.json("monthTrends.do"+cities, function(error, data) {
        x.domain(d3.extent(data.map(function(d) {  return parseDate(d.time_point); })));
        y.domain([0, d3.max(data.map(function(d) { return d.avg_time; }))]);
        x2.domain(x.domain());
        y2.domain(y.domain());

        var temp = focus.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);
//        temp.call(tip);
//        temp.on('mouseover', tip.show)
//            .on('mouseout', tip.hide);

        focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

        focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);

        context.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area2);

        context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

        context.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);
        });

    function brushed() {
//        updateFocus(brush.empty() ? x2.domain() : brush.extent(), totalW, totalH);
        x.domain(brush.empty() ? x2.domain() : brush.extent());
        focus.select(".area").attr("d", area);
        focus.select(".x.axis").call(xAxis);
        }
}

/**
 * 创建月平均图
 */
function createMonthAvg(){
    var width = 960,
        height = 17,
        cellSize = 17; // cell size

    var day = d3.time.format("%w"),
        week = d3.time.format("%U"),
        monthd = d3.time.format("%m"),
        format = d3.time.format("%Y-%m-%d");

    var color = d3.scale.quantize()
        .domain([100, 0])
        .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

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
    var color = ["#A50026","#D73027","#F46D43","#FDAE61","#FEE08B",
        "#FFFFBF","#D9EF8B","#A6D96A","#66BD63","#1A9850","#006837"];
    var color2 = ["#330000","#4C0000","#660000","#800000","#990000",
        "#B20000","#CC0000","#E60000","#FF0000","#FF1919","#FF3333","#FF4D4D"];
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
                console.log(d+":"+monthd(d.time_point));
                return color2[monthd(d.time_point)];
            })
            .select("title")
            .text(function(d) { return d + ": " + d3.round(data[d]); });
    });

    function monthPath(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = +day(t0), w0 = +week(t0),
            d1 = +day(t1), w1 = +week(t1);
        console.log("t:"+t0+"\n"+t1);
        console.log("d:"+d0+"\n"+d1);
        console.log("w:"+w0+"\n"+w1);
        return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
            + "H" + w0 * cellSize + "V" + cellSize
            + "H" + w1 * cellSize + "V" + cellSize
            + "H" + (w1 + 1) * cellSize + "V" + 0
            + "H" + (w0 + 1) * cellSize + "Z";
    }

//    d3.select(self.frameElement).style("height", "500px");
}

function createMonthDetail(){
    var width = 960,
        height = 136,
        cellSize = 17; // cell size

    var day = d3.time.format("%w"),
        week = d3.time.format("%U"),
//        percent = d3.format("4d"),
        format = d3.time.format("%Y-%m-%d");

    var color = d3.scale.quantize()
        .domain([100, 0])
        .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

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
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize ; })
        .datum(format);

    rect.append("title")
        .text(function(d) { return d; });

    svg.selectAll(".month")
        .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    d3.json("dayTrends.do", function(error, json) {
        var data = d3.nest()
            .key(function(d) { return d.time_point; })
            .rollup(function(d) { return d[0].avg_time; })
            .map(json);

        rect.filter(function(d) { return d in data; })
            .attr("class", function(d) { return "day " + color(data[d]); })
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

//    d3.select(self.frameElement).style("height", "500px");
}
/**
 * 日历详细趋势图
 */
function initDetailTrends(){
    createMonthAvg();
    createMonthDetail();

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