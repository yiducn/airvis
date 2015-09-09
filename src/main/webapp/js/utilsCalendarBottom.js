/**
 * Created by yidu on 2015/1/9.
 */

//地图对象
var map;
//谷歌地图与bing地形地图
var mapLayer,hybridLayer;
//各种叠加图层
var locationLayer, heatmapLayer, polygonLayer;
//各种过滤控件
var polygonConrtol, navControl,provinceSelectionControl,pointSelectionControl;
var currentBrush;//当前的时间刷

var temp;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code
var apiKey = "AqTGBsziZHIJYYxgivLBf0hVdrAk9mWO5cQcb8Yux8sW5M8c8opEC2lZqKR1ZZXf";
OpenLayers.ProxyHost = "proxy.jsp?url=";

//TODO 增加更多颜色映射
/**
 * 颜色映射
 * @type {string[]}
 */
var pointMap = ["#FF0000","#FF1A00","#FF3300",
    "#FF4C00","#FF6600","#FF8000","#FF9900",
    "#FFB200","#FFCC00","#FFE600","#FFFF00",
    "#E6FF00","#CCFF00","#B2FF00","#99FF00",
    "#80FF00","#66FF00","#4DFF00","#33FF00",
    "#19FF00","#00FF00"];
var color4Heat = d3.scale.quantize()
    .domain([200, 0])
    .range(d3.range(20).map(function(d) { return pointMap[d]; }));
var color4Calendar = d3.scale.quantize()
    .domain([200, 0])
    .range(d3.range(20).map(function(d) { return "r" + d + "-11"; }));

function initUIs(){
	mapLayer = new OpenLayers.Layer.Google(
		"Google Physical", // the default
		{numZoomLevels: 20}
	);
    hybridLayer = new OpenLayers.Layer.Bing({
        name: "Hybrid",
        key: apiKey,
        type: "AerialWithLabels"
    });

	map = new OpenLayers.Map('map', {
		projection: new OpenLayers.Projection("EPSG:4326"),
		displayProjection: new OpenLayers.Projection("EPSG:900913"),
//        layers: [hybridLayer,mapLayer],
		layers: [mapLayer],
//        layers:[hybridLayer],
		center: new OpenLayers.LonLat(105.6670345, 38.0121105)
			.transform('EPSG:4326', 'EPSG:900913'),
		zoom: 4
	});

	heatmapLayer = new OpenLayers.Layer.Heatmap( "heatmap", map, mapLayer,//hybridLayer,
		{
			opacity:0,
			radius:10,
            scaleRadius: true,
            gradient: {
                1.0:"#FF0000",0.95:"#FF1A00",
                0.9:"#FF3300",0.85:"#FF4C00",
                0.8:"#FF6600",0.75:"#FF8000",
                0.7:"#FF9900",0.65:"#FFB200",
                0.6:"#FFCC00",0.55:"#FFE600",
                0.5:"#FFFF00",0.45:"#E6FF00",
                0.4:"#CCFF00",0.35:"#B2FF00",0.3:"#99FF00",
                0.25:"#80FF00",0.2:"#66FF00",
                0.15:"#4DFF00",0.1:"#33FF00",
                0.05:"#19FF00",0:"#00FF00"},
			projection:"EPSG:900913"
		}, {
			visible: true,
			isBaseLayer: false,
			alwaysInRange : true,
			projection:"EPSG:900913"
		});
	heatmapLayer.projection = "EPSG:900913";

	map.addLayers([heatmapLayer]);

    locationLayer = createLocationLayer();
	map.addLayer(locationLayer);

    createProvinceSelControl();
	createPolygonControl();
    createPointSelControl();
}

/**
 * 添加选择支持
 */
function createPointSelControl(){
    pointSelectionControl = new OpenLayers.Control.SelectFeature(
        [locationLayer],
        {
            clickout: true, toggle: false,
            multiple: false, hover: false,
//            toggleKey: "ctrlKey", // ctrl key removes from selection
            multipleKey: "ctrlKey"//shiftKey" // shift key adds to selection
        }
    );

    map.addControl(pointSelectionControl);
    pointSelectionControl.activate();
}

/**
 * 创建点层
 */
function createLocationLayer(){
    var vector_style = new OpenLayers.Style({
        'fillColor': '#ee0011',
        'fillOpacity': .8,
        'strokeColor': '#aaee77',
        'strokeWidth': 0,
        'pointRadius': 4
    });
    var context = {
        getSize: function(feature){
            return 3;
        },
        getColor: function(feature){
            return color4Heat(feature.data.value);
        }
    };
    var template = {pointRadius: "${getSize}",
        fillColor:"${getColor}",
        'strokeWidth': 0,
        'pointRadius': 4
    };

    var vector_style2 = new OpenLayers.Style(template, {context:context});

    var vector_style_map = new OpenLayers.StyleMap({
        'default': vector_style2,
        'select': vector_style
    });
    locationLayer = new OpenLayers.Layer.Vector('location',{styleMap:vector_style_map,renderOptions: {zIndexing: true}});
    var features = [];
    locationLayer.addFeatures(features);
    locationLayer.events.on({
        "featureselected":function(e){
            if(currentBrush == null){
                console.log("no brush ");
                return;//之后改成地图上也能zoomable
            }
            var selectedFeature = e.feature;
            function onPopupClose(evt) {
                pointSelectionControl.unselect(selectedFeature);
            }
            var id = "station"+e.feature.data.station_code;
            var popup = new OpenLayers.Popup.FramedCloud("chicken",
                e.feature.geometry.getBounds().getCenterLonLat(),
                null,
                    "<div style='font-size:.8em' id="+id+">"+"</div>",
                null, false, onPopupClose);
            popup.autoSize = true;
            popup.minSize = new OpenLayers.Size(400,180);
            popup.size = new OpenLayers.Size(400,180);
            e.feature.popup = popup;
            map.addPopup(popup);
            var dragPopup = new OpenLayers.Control.DragPopup(popup);
            map.addControl(dragPopup);
            createHourDetail(id,340,150,"station_code="+ e.feature.data.station_code);
        },
        "featureunselected":function(e){
            map.removePopup(e.feature.popup);
            e.feature.popup.destroy();
            e.feature.popup = null;
        }
    });
    return locationLayer;
}

/**
 * 激活多边形选择控件
 */
function activePolygonConrtol(){
	polygonConrtol.activate();
	provinceSelectionControl.deactivate();
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
	provinceSelectionControl.deactivate();
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
//                console.log(event)
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
    //创建点
	$.ajax({
        url:"year.do",
        data: "timeList=2014",
		type:"post",
		dataType:"json",
		success:function(data){
			var newData = [];
			var i;
			for(i = 0; i < data.data.length; i ++){
				//坐标点转换
				if(event.feature.geometry.containsPoint(
					new OpenLayers.Geometry.Point(data.data[i].longitude,data.data[i].latitude).transform(epsg4326, projectTo))) {
					newData.push(data.data[i]);
				}
			}
			filteredData = newData;
			buildLocationLayer(newData);
            //更新trends()
            linearTime();
            //更新日历
            if(currentBrush == null || currentBrush[1].getTime()-currentBrush[0].getTime() > 604800000)
                cycleTime();
            else
                cycleHour(currentBrush);
		}
	});
    //创建热力图
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
//    data.max
	var transformedData = { max: data.max , min:0,data: [] };
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
        url:"year.do",
        data: "timeList=2014",
//		url:"cities.do",
		type:"post",
		dataType:"json",
		success:function(data){
			buildLocationLayer(data.data);
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
				new OpenLayers.Geometry.Point(data[i].longitude,data[i].latitude).
					transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
                {value:data[i].pm25_ave,station_code:data[i].station_code}
            )
		);
	}
	locationLayer.addFeatures(features);

}

/**
 * 创建线性选择，由两个部分组成
 */
function linearTime(){
    linearTimeContext();
    linearTimeDetail();
}
/**
 * 创建线性选择，的context部分
 */
function linearTimeContext(){
	$("#detailTrendsContext").empty();
	var totalW = 1920, totalH = 100;
	var margin = {top: 10, right: 10, bottom: 40, left: 100},
		width = totalW - margin.left - margin.right,
		height = totalH - margin.top - margin.bottom;

	var parseDate = d3.time.format("%Y-%m-%d").parse;
    var color = d3.scale.category10();

	var x = d3.time.scale().range([0, width]),
		y = d3.scale.linear().range([height, 0]);

	var xAxis = d3.svg.axis().scale(x).orient("bottom");

	var brush = d3.svg.brush()
		.x(x)
		.on("brush", brushed)
        .on("brushend",brushend);

	var line = d3.svg.line()
//		.interpolate("monotone")
		.x(function(d) {return x(parseDate(d.time_point)); })
		.y(function(d) { return y(d.pm25_ave); });

	var svg = d3.select("#detailTrendsContext").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom);

	var context = svg.append("g")
		.attr("class", "context")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var cmd = "";//调用的接口

    var station_codes = "";
    if(filteredData.length != 0) {
        station_codes = "station_code=" + filteredData[0].station_code + "";
        for (var i = 1; i < filteredData.length; i++) {
            station_codes += ("&station_code=" + filteredData[i].station_code);
        }
        cmd = "allDayTrendsByStationCodes.do" + "?" + station_codes;
    }else{
        cmd = "allDayTrendsByStationCodes.do";
    }

    console.log(cmd);
	d3.json(cmd, function(error, data) {
        data.sort(function(a, b){ return d3.ascending(a.time_point, b.time_point); });
        color.domain(d3.keys(data[0]).filter(function(key) {
            return key === "pm25_ave";
        }));
        //检测指标
        var attrs = color.domain().map(function(name) {
            return {
                name: name,
                values: data.map(function(d) {
                    return {time_point: d.time_point, pm25_ave: +d[name]};
                })
            };
        });

        x.domain(d3.extent(data.map(function(d) {  return parseDate(d.time_point); })));
        //固定y轴最大数值
        y.domain([0, d3.max(data.map(function(d) { return d.pm25_ave; }))]);

        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
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
            .attr("height", height + 7);

        var attr = context.selectAll(".attr")
            .data(attrs)
            .enter().append("g")
            .attr("class", "attr");

        attr.append("path")
            .attr("class", "line")
            .attr("d", function(d) {return line(d.values); })
            .style("stroke", function(d) { return color(d.name); });
	});

	function brushed() {
        var format = d3.time.format("%Y-%m-%d");
        currentBrush = [format.parse(format(brush.extent()[0])),
            format.parse(format(brush.extent()[1]))];//brush.extent();

        if(brush.empty()){
            linearTimeDetail(x.domain());
        }else {
            linearTimeDetail(currentBrush);//brush.extent());
        }
	}
    function brushend(){
        var format = d3.time.format("%Y-%m-%d");
        currentBrush = [format.parse(format(brush.extent()[0])),
            format.parse(format(brush.extent()[1]))];//brush.extent();
        //TODO 修改时间？自动？
        if(currentBrush[1].getTime()-currentBrush[0].getTime() < 604800000*2){
            cycleHour(currentBrush);
            //根据需求zoom
            linearTimeDetailZoom(currentBrush);
        }else{
            cycleTime();
        }
    }
}

var focus;
/**
 * 根据brush的粒度，呈现detail
 * @tag 0 为不缩放 1为缩放
 */
function linearTimeDetail(extent){
    $("#detailTrendsFocus").show();
    $("#detailTrendsFocusZoom").hide();
    var totalW = 1920, totalH = 400;
    //1为上面那个 2为下面那个
    var margin = {top: 10, right: 10, bottom: 40, left: 100},
        width = totalW - margin.left - margin.right,
        height = totalH - margin.top - margin.bottom;

    var parseDate = d3.time.format("%Y-%m-%d").parse;
    var color = d3.scale.category10();

    var x = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]).domain([0,  200]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var line = d3.svg.line()
        .interpolate("monotone")
        .x(function (d) {
            return x(parseDate(d.time_point));
        })
        .y(function (d) {
            return y(d.pm25_ave);
        });

    if(extent == null) {
        $("#detailTrendsFocus").empty();
        var svg = d3.select("#detailTrendsFocus").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        var legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + margin.left + "," + 0 + ")");

        var cmd = "";
        var station_codes = "";
        if(filteredData.length != 0) {
            station_codes = "station_code=" + filteredData[0].station_code + "";
            for (var i = 1; i < filteredData.length; i++) {
                station_codes += ("&station_code=" + filteredData[i].station_code);
            }
            cmd = "allDayTrendsByStationCodes.do" + "?" + station_codes;
        }else{
            cmd = "allDayTrendsByStationCodes.do";
        }

        d3.json(cmd, function (error, data) {
            data.sort(function(a, b){ return d3.ascending(a.time_point, b.time_point); });
            color.domain(d3.keys(data[0]).filter(function (key) {
                return key === "pm25_ave";
            }));
            //检测指标
            var attrs = color.domain().map(function (name) {
                return {
                    name: name,
                    values: data.map(function (d) {
                        return {time_point: d.time_point, pm25_ave: +d[name]};
                    })
                };
            });

            x.domain(d3.extent(data.map(function (d) {
                return parseDate(d.time_point);
            })));
            //固定y轴最大数值
            y.domain([0, d3.max(data.map(function (d) {
                return 400;
            }))]);//d.avg_time; }))]);
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
                .attr("d", function (d) {
                    return line(d.values);
                })
                .style("stroke", function (d) {
                    return color(d.name);
                });

            var legendItem = legend.selectAll('.attr')
                .data(attrs.map(function (d) {
                    return d.name;
                }))
                .enter().append("g")
                .attr("transform", function (d, i) {
                    return "translate(0," + i * 18 + ")";
                })
                .attr("class", "attr legend");

            legendItem.append("rect")
                .attr("width", 13)
                .attr("height", 13)
                .attr("fill", function (d) {
                    return color(d);
                });

            legendItem.append("text")
                .attr("x", 15)
                .attr("y", 10.5)
                .text(function (d) {
                    return d;
                });
        });
    }else{
//        console.log(brush);
        x.domain(extent);
        focus.selectAll(".attr").selectAll("path")
            .transition()
            .attr("d", function(d) {return line(d.values); });
		focus.select(".x.axis").call(xAxis);
    }
}

/**
 * zoom
 * @param currentBrush
 */
function linearTimeDetailZoom(extent){
    var totalW = 1920, totalH = 400;
    //1为上面那个 2为下面那个
    var margin = {top: 10, right: 10, bottom: 40, left: 40},
        width = totalW - margin.left - margin.right,
        height = totalH - margin.top - margin.bottom;

    var parseDate = d3.time.format("%Y-%m-%d").parse;
    var color = d3.scale.category10();

    var x = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]).domain([0,  200]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var line = d3.svg.line()
        .interpolate("monotone")
        .x(function (d) {
            return x(parseDate(d.time_point));
        })
        .y(function (d) {
            return y(d.pm2_5);
        });

    parseDate = d3.time.format("%Y-%m-%dT%H:00:00Z").parse;
    line = d3.svg.line()
        .interpolate("monotone")
        .x(function (d) {
            return x(parseDate(d.time_point));
        })
        .y(function (d) {
            return y(d.pm2_5);
        });
    $("#detailTrendsFocusZoom").empty();
    var svg = d3.select("#detailTrendsFocusZoom").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + margin.left + "," + 0 + ")");


    var f = d3.time.format("%Y-%m-%d");

    var cmd = "";
    if(filteredData.length != 0) {
        var station_codes;
        station_codes = "station_code=" + filteredData[0].station_code + "";
        for (var i = 1; i < filteredData.length; i++) {
            station_codes += ("&station_code=" + filteredData[i].station_code);
        }
        cmd = "hourTrends2.do" +
            "?startTime="+f(new Date(extent[0]))+
            "&endTime="+f(new Date(extent[1])) + "&"+station_codes;
    }else{
        cmd = "hourTrends2.do"+
            "?startTime="+f(new Date(extent[0]))+
            "&endTime="+f(new Date(extent[1]));
    }

    d3.json(cmd, function (error, data) {
        data.sort(function(a, b){
//            console.log(a.time_point+":"+ b.time_point);
            return d3.ascending(a.time_point, b.time_point); });
        color.domain(d3.keys(data[0]).filter(function (key) {
            return key === "pm2_5";
        }));
        //检测指标
        var attrs = color.domain().map(function (name) {
            return {
                name: name,
                values: data.map(function (d) {
                    return {time_point: d.time_point, pm2_5: +d[name]};
                })
            };
        });

        x.domain(d3.extent(data.map(function (d) {
            return parseDate(d.time_point);
        })));
        //固定y轴最大数值
        y.domain([0, d3.max(data.map(function (d) {
            return 400;
        }))]);//d.avg_time; }))]);
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
            .attr("d", function (d) {
                return line(d.values);
            })
            .style("stroke", function (d) {
                return color(d.name);
            });

        var legendItem = legend.selectAll('.attr')
            .data(attrs.map(function (d) {
                return d.name;
            }))
            .enter().append("g")
            .attr("transform", function (d, i) {
                return "translate(0," + i * 18 + ")";
            })
            .attr("class", "attr legend");

        legendItem.append("rect")
            .attr("width", 13)
            .attr("height", 13)
            .attr("fill", function (d) {
                return color(d);
            });

        legendItem.append("text")
            .attr("x", 15)
            .attr("y", 10.5)
            .text(function (d) {
                return d;
            });
    });
    $("#detailTrendsFocus").hide();
    $("#detailTrendsFocusZoom").show();
}
/**
 * 构建timeList
 * @param start
 * @param end
 * @returns {string}
 */
function constructTimeList(start, end){
    var result = [];
    var nday = (end - start)/86400000 + 1
    var i ;
    var format = d3.time.format("%Y-%m-%dT%H:00:00Z");
    var formatTimeList = d3.time.format("%Y-%m-%d");
    for(i = 0; i < nday; i ++){
        result[i] = formatTimeList(new Date(start+i*86400000));
    }
    var r = "";
    for(i = 0; i < nday; i ++){
        r += ("timeList="+result[i]+"&");
    }

    return r;
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
 * 天、周趋势图
 */
function cycleHour(extent){
    var id = "cycleHourDetail";
    $("#detailTrendsCycle").empty();
    $("#detailTrendsCycle").html("<div id=" + id + "></div>");
    createHourDetail(id,1920, 100);
}
/**
 *
 * @param id 绘制的目标id
 * @param totalW
 * @param totalH
 * @param stationCodes 站点号对应的查询字符串，如codes=1876A&codes=1877A
 */
function createHourDetail(id, totalW, totalH, stationCodes){
    var f = d3.time.format("%Y-%m-%d");
    var nday = (new Date(f(new Date(currentBrush[1]))).getTime() -
        new Date(f(new Date(currentBrush[0]))).getTime())/86400000 + 1;

    var margin = { top: 0, right: 0, bottom: 0, left: 100 },
        width = totalW - margin.left - margin.right,
        height = totalH - margin.top - margin.bottom,
        gridHeight = Math.floor(height / nday),
        gridWidth = Math.floor(width / 24);
    var cmd = "";

    if(filteredData.length != 0 && stationCodes == null) {
        var station_codes;
        station_codes = "station_code=" + filteredData[0].station_code + "";
        for (var i = 1; i < filteredData.length; i++) {
            station_codes += ("&station_code=" + filteredData[i].station_code);
        }
        cmd = "hourTrends2.do" +
            "?startTime="+f(new Date(currentBrush[0]))+
            "&endTime="+f(new Date(currentBrush[1])) + "&"+station_codes;
    }else if (stationCodes != null){
        cmd = "hourTrends2.do"+
            "?startTime="+f(new Date(currentBrush[0]))+
            "&endTime="+f(new Date(currentBrush[1]))+"&"+
            stationCodes;
    }else{
        cmd = "hourTrends2.do"+
            "?startTime="+f(new Date(currentBrush[0]))+
            "&endTime="+f(new Date(currentBrush[1]));
    }

    //显示日期
    var days = [];
    var i ;
    var formatTimeList = d3.time.format("%Y-%m-%d");
    for(i = 0; i < nday-1; i ++){
        days[i] = formatTimeList(new Date(new Date(currentBrush[0]).getTime()+i*86400000));
    }

    d3.json(cmd,
        function(error, data) {
            var format = d3.time.format("%Y-%m-%dT%H:00:00Z");
            var svg = d3.select("#"+id).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var heatMap = svg.selectAll(".hour")
                .data(data)
                .enter().append("rect")
                .attr("x", function(d) {
                    return (format.parse(d.time_point).getHours()) * gridWidth;
                })
                .attr("y", function(d) {
                    //TODO 根据时间先后
//                    console.log(d.time_point+":"+format.parse(d.time_point).getDay());
                        return (format.parse(d.time_point).getDate()-new Date(currentBrush[0]).getDate()) * gridHeight;
                })
                .attr("class", "hour bordered")
                .attr("width", gridWidth)
                .attr("height", gridHeight)
                .style("fill", function(d) { return color4Heat(d.pm2_5); })
                .style("stroke",function(){return "#666666"});

            heatMap.append("title").text(function(d) { return format.parse(d.time_point).getHours()+":"+ d3.round(d.pm2_5); });

            var dayLabels = svg.selectAll(".dayLabel")
                .data(days)
                .enter().append("text")
                .text(function (d) {
                    var j = formatTimeList.parse(d).getDay();

                    return d+"("+j+")";
                })
                .attr("x", 0)
                .attr("y", function (d, i) { return i * gridHeight; })
                .style("text-anchor", "end")
                .attr("transform", "translate(-6," + gridHeight / 1.5 + ")")
                .attr("class", function (d, i) {var j = formatTimeList.parse(d).getDay();
                    i = j;
                    return ((j > 0 && i <= 5) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); });

        });
}

function createMonthDetail(){
	var width = 1920,
		height = 100,
		cellSize = 17; // cell size
    var cellWidth = 36,
        cellHeight = 14;

	var day = d3.time.format("%w"),
		week = d3.time.format("%U"),
//        percent = d3.format("4d"),
		format = d3.time.format("%Y-%m-%d");

	var svg = d3.select("#monthDetail").selectAll("svg")
		.data(d3.range(2014, 2015))
		.enter().append("svg")
		.attr("width", width)
		.attr("height", height+cellHeight)
		.attr("class", "RdYlGn")
		.append("g")
		.attr("transform", "translate(" + 1 + "," + 0 + ")");

	var rect = svg.selectAll(".day")
		.data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
		.enter().append("rect")
		.attr("class", "day")
		.attr("width", cellWidth)
		.attr("height", cellHeight)
		.attr("x", function(d) { return week(d) * cellWidth; })
		.attr("y", function(d) { return day(d) * cellHeight ; })
		.datum(format);

	rect.append("title")
		.text(function(d) { return d; });

	svg.selectAll(".month")
		.data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
		.enter().append("path")
		.attr("class", "month")
		.attr("d", monthPath);

    var cmd = "";
    var station_codes = "";
    if(filteredData.length != 0) {
        station_codes = "station_code=" + filteredData[0].station_code + "";
        for (var i = 1; i < filteredData.length; i++) {
            station_codes += ("&station_code=" + filteredData[i].station_code);
        }
        cmd = "allDayTrendsByStationCodes.do" + "?" + station_codes;
    }else{
        cmd = "allDayTrendsByStationCodes.do";
    }

	d3.json(cmd, function(error, json) {
		var data = d3.nest()
			.key(function(d) { return d.time_point; })
			.rollup(function(d) { return d[0].pm25_ave; })
			.map(json);

		rect.filter(function(d) { return d in data; })
			.attr("class", function(d) { return "day " + color4Calendar(data[d]); })
			.select("title")
			.text(function(d) { return d + ": " + d3.round(data[d]); });
	});

	function monthPath(t0) {
		var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
			d0 = +day(t0), w0 = +week(t0),
			d1 = +day(t1), w1 = +week(t1);
		return "M" + (w0 + 1) * cellWidth + "," + d0 * cellHeight
			+ "H" + w0 * cellWidth + "V" + 7 * cellHeight
			+ "H" + w1 * cellWidth + "V" + (d1 + 1) * cellHeight
			+ "H" + (w1 + 1) * cellWidth + "V" + 0
			+ "H" + (w0 + 1) * cellWidth + "Z";
	}

//    d3.select(self.frameElement).style("height", "500px");
}

