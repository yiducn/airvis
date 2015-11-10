/**
 * Created by yidu on 11/10/15.
 */
/**
 * Created by cnic on 2015/1/9.
 */

//地图对象
var map;
//谷歌地图与bing地形地图
//var mapLayer,hybridLayer;
//各种叠加图层
var locationLayer, heatmapLayer, polygonLayer;
//各种过滤控件
var polygonConrtol, navControl,provinceSelectionControl;

var temp;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code
var apiKey = "AqTGBsziZHIJYYxgivLBf0hVdrAk9mWO5cQcb8Yux8sW5M8c8opEC2lZqKR1ZZXf";
OpenLayers.ProxyHost = "proxy.jsp?url=";

var pointMap = [
    new OpenLayers.Style({'fillColor': "#FF0000"}),
    new OpenLayers.Style({'fillColor': "#FF1A00"}),
    new OpenLayers.Style({'fillColor': "#FF3300"}),
    new OpenLayers.Style({'fillColor': "#FF4C00"}),
    new OpenLayers.Style({'fillColor': "#FF6600"}),
    new OpenLayers.Style({'fillColor': "#FF8000"}),
    new OpenLayers.Style({'fillColor': "#FF9900"}),
    new OpenLayers.Style({'fillColor': "#FFB200"}),
    new OpenLayers.Style({'fillColor': "#FFCC00"}),
    new OpenLayers.Style({'fillColor': "#FFE600"}),
    new OpenLayers.Style({'fillColor': "#FFFF00"}),
    new OpenLayers.Style({'fillColor': "#E6FF00"}),
    new OpenLayers.Style({'fillColor': "#CCFF00"}),
    new OpenLayers.Style({'fillColor': "#B2FF00"}),
    new OpenLayers.Style({'fillColor': "#99FF00"}),
    new OpenLayers.Style({'fillColor': "#80FF00"}),
    new OpenLayers.Style({'fillColor': "#66FF00"}),
    new OpenLayers.Style({'fillColor': "#4DFF00"}),
    new OpenLayers.Style({'fillColor': "#33FF00"}),
    new OpenLayers.Style({'fillColor': "#19FF00"}),
    new OpenLayers.Style({'fillColor': "#00FF00"})];

function initUIs(){
    $('#map').css("width", window.screen.availWidth).css("height", window.screen.availHeight);
    var map = L.map('map').setView([38.0121105, 105.6670345], 5);
    // Possible types: SATELLITE, ROADMAP, HYBRID
    var googleLayer = new L.Google('ROADMAP');
    map.addLayer(googleLayer);

    //heatmapLayer = new OpenLayers.Layer.Heatmap( "heatmap", map, osm,
    //    {
    //        opacity:80,
    //        radius:20,
    //        gradient: {0.45: "rgb(0,0,255)", 0.55: "rgb(0,255,255)", 0.65: "rgb(0,255,0)", 0.95: "yellow", 1.0: "rgb(255,0,0)"},
    //        projection:"EPSG:4326"
    //    }, {
    //        visible: true,
    //        isBaseLayer: false,
    //        alwaysInRange : true,
    //        projection:"EPSG:4326"
    //    });
    //heatmapLayer.projection = "EPSG:4326";
    //
    //map.addLayer(heatmapLayer);

    locationLayer = new OpenLayers.Layer.Vector('location');
    //var features = [];
    //locationLayer.addFeatures(features);
    //var vector_style = new OpenLayers.Style({
    //    'fillColor': '#ee0011',
    //    'fillOpacity': .8,
    //    'strokeColor': '#aaee77',
    //    'strokeWidth': 1,
    //    'pointRadius': 4
    //});
    //var vector_style_map = new OpenLayers.StyleMap({
    //    'default': vector_style
    //});
    //locationLayer.styleMap = vector_style_map;
    //map.addLayer(locationLayer);
    //
    ////createProvinceSelControl();
    //createPolygonControl();
}

/**
 * 激活多边形选择控件
 */
function activePolygonConrtol(){
    polygonConrtol.activate();
    //provinceSelectionControl.deactivate();
}

function activeProvinceSelectionControl(){
    provinceSelectionControl.activate();
    polygonConrtol.deactivate();
}
/**
 * 取消激活多边形选择控件
 */
function activeNavControl(){
    polygonConrtol.deactivate();
    //provinceSelectionControl.deactivate();
}

/**
 * 创建省份选择控件
 */
function createProvinceSelControl(){
    var base = new OpenLayers.Layer.WMS('base',
        'http://www.ms.dviz.cn/cgi/c',
        {
            layers:'shp_cn_province',
            transparent:true,
            projection:"EPSG:4326"
        },{
            isBaseLayer:true,
            singleTile:true
        });
    map.addLayer(base);
//    var vecLyr = map.getLayersByName('base')[0];
//    map.raiseLayer(vecLyr, map.layers.length);
//    map.setLayerIndex(base, 99);

    provinceSelectionControl = new OpenLayers.Control.WMSGetFeatureInfo({
        url: 'http://www.ms.dviz.cn/cgi/c',
        layers : [base],
        queryVisible: true,
        infoFormat :'text/plain',
        eventListeners: {
            getfeatureinfo: function (event) {
                console.log(event)
                var prcode_re = /\d{6}/;
                var prcodes = event.text.match(prcode_re);
//                console.log(prcodes[0])
                base.mergeNewParams({code:prcodes[0],_:new Date().getTime()});
            }
        }
    });
    map.addControl(provinceSelectionControl);
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
                        new OpenLayers.Geometry.Point(data[i].longitude,data[i].latitude).transform(epsg4326, projectTo))) {
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
            var newData = {};
            newData.max = data.max;
            newData.data = [];
            var i;
            for(i = 0; i < data.length; i ++){
                //坐标点转换
                if(event.feature.geometry.containsPoint(
                        new OpenLayers.Geometry.Point(data[i].longitude,data[i].latitude).transform(epsg4326, projectTo))) {
                    newData.data.push(data[i]);
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
            lonlat: new OpenLayers.LonLat(data[length].longitude, data[length].latitude).
                transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
            count: data[length].pm25
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
    console.log("build location layer")
    locationLayer.removeAllFeatures();
    var features = [];
    for ( var i = 0; i < data.length; ++i) {
        features.push(new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(data[i].longitude,data[i].latitude).transform('EPSG:4326', 'EPSG:3857')
            )
        );
    }
    locationLayer.addFeatures(features);

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

        rect.filter(function(d) {console.log("date:"+d); return d in data; })
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
