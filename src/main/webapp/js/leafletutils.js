/**
 * Created by yidu on 11/10/15.
 */
//地图对象
var map;

//各种叠加图层
var locationLayer, freedrawLayer, meteorologicalStationLayer;
var scatterGroup, clusterLayer, themeLayer,corHeatMapLayer, gridsView, windsView;
var stlLayer, aqHeatMapLayer, windLayer;
var detailWindLayer;
var filterControl;
var provinceBoundaryOverlay, cityBoundaryOverlay, provinceValueOverlay, cityValueOverlay;

var overAllBrush, detailBrush;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code
var unfilteredData = [];//经过过滤后剩下的数据,结构同filteredData
var COR_THREADHOOD = 0.6;
var SIZE_RING = 120;
var GRID_SIZE_CORRELATION = 4;//correlation map的grid 大小
var displayPoint = false;//判断点是不是已经显示过一次了,如果显示过则不需要再重置filteredData

//控件参数
var startAngleControl = 75;//北偏西15,startAngle范围是西到北到东0 90 180
var swap = 30;//swap范围(0, 180)
var distance = 60;
var r = 20;

var windy;
var windData;

var paintControl = {
    calendar        :   false,
    calendarType    :   1,//0dayofmonth
    trend           :   false,
    stations        :   false,
    mstations       :   false
};

var optPoint = {fillColor:'#FF0000', fill:true, color:'#FF0000', fillOpacity:0.7, opacity:0.7};

// option of meteorological station
var meteorologicalStationOption = {fillColor:'#0000FF', fill:true, color:'#0000FF', fillOpacity:0.7, opacity:0.7};

var cursorX;
var cursorY;
document.onmousemove = function(e){
    cursorX = e.pageX;
    cursorY = e.pageY;
}
var piemenu;

//max and min distance of context ring
var maxDis, minDis;

/**
 * active free draw function
 */
var freedrawEvent = {latLngs:[]};

var realRatio = 1;
var CALENDAR_WIDTH_DEFAULT = 800;
var CALENDAR_HEIGHT_DEFAULT = 600;

//overall color scale
var colors = ["#FF0000", "#FFFF00"];
var c1 = ["#FF0000", "#FFFF00"];
var c2 = ["#FFFF00", "#00FF00"];
var c3 = ["#FF0000", "#FFFF00", "#00FF00"];

var colorScale = d3.scale.linear().domain([200, 0]).range(colors);
var colorScaleCor = d3.scale.linear().domain([1, 0]).range(c1);
var colorScaleCorLag = d3.scale.linear().domain([0, 1]).range(c2);
var colorScaleCor4Heatmap  = d3.scale.linear().domain([1, 0, -1]).range(c3);
var colorLLCGroup = d3.scale.linear().domain([1, 0, -1]).range(c3);

//当前选择的月份
//var currentSelectedDate = new Date("2015-10-01");

//contextRing param
var sizeScreen;
var outerRadius;
var innerRadius;

var clusterResult;
var circles;// 用来实现cluster的动画
//八边形从北开始顺时针,各个格子在屏幕中的位置
var octagonLocationScreen = [];
//从北侧开始顺时针,各个区域的path
var octagonPath = [];

//contextRing的option
var contextRingOption = {};

function initUIs(){
    //$('#map').css("width", window.screen.availWidth).css("height", window.screen.availHeight);
    L.mapbox.accessToken = 'pk.eyJ1Ijoic3Vuc25vd2FkIiwiYSI6ImNpZ3R4ejU3ODA5dm91OG0xN2d2ZmUyYmIifQ.jgzNI617vX6h48r0_mRzig';
    map = L.mapbox.map('map', 'mapbox.streets')
        .setView([25, 100], 4);
    //map = new L.Map("map", {center: [23, 120], zoom: 4})
    //    .addLayer(new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"));
    map.options.minZoom = 1;//4;
    map.options.maxZoom = 36;//13;

    //add location layer
    locationLayer = L.layerGroup();
    locationLayer.addTo(map);

    //meteorologicalStationLayer
    meteorologicalStationLayer = L.layerGroup();
    meteorologicalStationLayer.addTo(map);

    //piemenu
    piemenu = new wheelnav('piemenu');
    //piemenu.slicePathFunction = slicePath().DonutSlice;
    //操作-> group、ungroup(divided by province/county)
    //Analysis->trends, factors, factors with wind,  nearby
    piemenu.createWheel(['Filter']);//, 'zoom&show']);//, 'group', 'ungroup', 'factors', 'factors with wind', 'nearby']);
    piemenu.navItems[0].navigateFunction = displayFilter;
    //piemenu.navItem[1].navigateFunction = activeContextRing;
    piemenu.wheelRadius = 50;

    map.on('zoomend', function() {
        //controlCluster();
        //controlThemeRiver();

        if($("#controlContextRing").is(":checked")){
            //$( "#slider" ).slider( "option", "min", minDis );
            //$( "#slider" ).slider( "option", "max", maxDis );
            $("#maxDistance").text(parseInt(maxDis/1000) + "km");
            $("#minDistance").text(parseInt(minDis/1000) + "km");
        }

        controlDetailWind();
    });
    map.on('moveend', function(){

        $("#controlTrend").attr('checked', false);

        if($("#controlContextRing").is(":checked")){
            $("#maxDistance").text(parseInt(maxDis/1000) + "km");
            $("#minDistance").text(parseInt(minDis/1000) + "km");
        }
        //controlDetailWind();
    });

    $("#slider").slider();
    $( "#slider" ).on( "slidechange",
        function( event, ui ) {
            maxDis = ui.value;
            $("#maxDistance").text(parseInt(maxDis/1000) + "km");
            controlContextRing();
            controlCluster();
            controlThemeRiver();
        }
    );

    $("#sliderCor").slider({ value: COR_THREADHOOD*100});
    $( "#sliderCor" ).slider( "option", "min", 0.0 );
    $( "#sliderCor" ).slider( "option", "max", 100 );

    $( "#sliderCor" ).on( "slidechange",
        function( event, ui ) {
            $("#maxDistanceCor").text(ui.value/100);
            COR_THREADHOOD = ui.value/100;
            //controlCluster();
            controlThemeRiver();
        }
    );

    $("#sliderStartAngle").slider({value: 180});
    $("#sliderStartAngle").on("slide", function(event, ui){
        startAngleControl = ui.value;
        displayCustomizedFilter();
    });
    $("#sliderStartAngle").on("slidechange", function(event, ui){
        startAngleControl = ui.value;
        displayCustomizedFilter();
        clusterFilter();
    });

    $("#sliderSwap").slider({value:180});
    $("#sliderSwap").on("slide", function(event, ui){
        swap = ui.value;
        displayCustomizedFilter();
    });
    $("#sliderSwap").on("slidechange", function(event, ui){
        swap = ui.value;
        displayCustomizedFilter();
        clusterFilter();
    });

    $("#sliderRad").slider({ value: SIZE_RING});
    $( "#sliderRad" ).slider( "option", "min", 1 );
    $( "#sliderRad" ).slider( "option", "max", 200 );

    $( "#sliderRad" ).on( "slidechange",
        function( event, ui ) {
            $("#maxRad").text(ui.value);
            COR_THREADHOOD = ui.value;
            SIZE_RING = ui.value;
            controlContextRing();
        }
    );

    $( "#sliderCor" ).on( "slide",
        function( event, ui ) {
            $("#maxDistanceCor").text(ui.value/100);
        }
    );
    $( "#slider" ).on( "slide",
        function( event, ui ) {
            maxDis = ui.value;
            $("#maxDistance").text(parseInt(maxDis/1000) + "km");

            //distance = ui.value
        }
    );
    createCityValue();
    themeLayer = [];

    //初始化contextRing Option
    {
        outerRadius = $("#contextRing").height() > $("#contextRing").width() ? $("#contextRing").width()/2-5 : $("#contextRing").height()/2-5;
        innerRadius = outerRadius -  SIZE_RING;
        var centerScreenX = $("#contextRing").width()/2;
        var centerScreenY = $("#contextRing").height()/2;
        contextRingOption.outerRadius = outerRadius;
        contextRingOption.innerRadius = innerRadius;
        contextRingOption.centerScreenX = centerScreenX;
        contextRingOption.centerScreenY = centerScreenY;
        contextRingOption.canvasW = $("#contextRing").width();
        contextRingOption.canvasH = $("#contextRing").height();
    }



}


/**
 * 显示风
 */
function displayWind(){
    if(detailWindLayer != null) {
        if(windy != null)
            windy.stop();
        map.removeLayer(detailWindLayer);
    }
    //wind

    {
        $.ajax({
            url: "winddata2.do",
            type:"post",
            data:
            "startTime="+new Date(detailBrush[0])+
            "&endTime="+new Date(detailBrush[1]),
            success: function (data) {
                windData = JSON.parse(data);
                //windData = data;
            },
            async: false
        });
    }
    var BigPointLayer = L.CanvasLayer.extend({
        render: function() {
            windy = new Windy({ canvas: this.getCanvas(), data: windData });
            redraw2();
        }
    });
    detailWindLayer = new BigPointLayer();
    detailWindLayer.addTo(map);



    function redraw2(){
        detailWindLayer.getCanvas().width = map.getSize().x;
        detailWindLayer.getCanvas().height = map.getSize().y;

        windy.stop();

        setTimeout(function(){
            windy.start(
                [[0,0],[detailWindLayer.getCanvas().width, detailWindLayer.getCanvas().height]],
                detailWindLayer.getCanvas().width,
                detailWindLayer.getCanvas().height,
                [[map.getBounds()._southWest.lng, map.getBounds()._southWest.lat],[map.getBounds()._northEast.lng, map.getBounds()._northEast.lat]]
            );
        },500);
    }
}
/**
 * 创建中国地图轮廓
 */
function createChinamap(){
    var provinces = [];
    provinceBoundaryOverlay = L.d3SvgOverlay(function(sel, proj) {
        var upd = sel.selectAll('path').data(provinces);
        upd.enter()
            .append('path')
            .attr('d', proj.pathFromGeojson)
            .attr('stroke', 'black')
            .attr('fill-opacity', '0');
        upd.attr('stroke-width', 0.5 / proj.scale);
    });

    d3.json("maps/china_provinces.json",
        function (data) {
            provinces = data.features;
            provinceBoundaryOverlay.addTo(map)
        }
    );
}

/**
 * 填充中国地图颜色
 */
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
            .attr('fill-opacity', '0.9');
        //upd.attr('stroke-width', 1 / proj.scale);

    });

    var time = "";
    if(overAllBrush != null){
        time += "startTime="+overAllBrush[0] +"&endTime="+overAllBrush[1];
    }
    $.ajax({
        url: "valueByProvinces.do",
        type: "post",
        data: time,
        success: function (resultData) {
            var result = JSON.parse(resultData);
            var findValue = function(proName){
                for(var i = 0; i < result.length; i ++){
                    if(result[i]._id != null &&result[i]._id.substr(0,2) == proName.substr(0,2))
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
            .attr('fill-opacity', '0');

        upd.attr('stroke-width', 0.5 / proj.scale);
    });

    d3.json("maps/china_cities.json", function(data) { cities = data.features; cityBoundaryOverlay.addTo(map) });

}

/**
 * 按城市填充中国地图颜色
 */
function createCityValue(){
    //TODO 如果空 则创建,如果非空,则更新

    var cities = [];
    cityValueOverlay = L.d3SvgOverlay(function(sel, proj) {

        var upd = sel.selectAll('path').data(cities);
        upd.enter()
            .append('path')
            .attr('d', proj.pathFromGeojson)
            //.attr('stroke', 'black')
            .attr('stroke-width', '0px')
            .attr('stroke-opacity', '0')
            .attr("fill", function(d){
                return colorScale(d.pm25);
            })
            //.attr('fill', function(d){
            //    console.log(d);
            //    return d3.hsl(0.2 * 360, Math.random()*0.9, 0.5)
            //})
            .attr('fill-opacity', '0.9');
        upd.attr('stroke-width', 0.5 / proj.scale);
    });

    var time = "";
    if(overAllBrush != null){
        time += "startTime="+overAllBrush[0] +"&endTime="+overAllBrush[1];
    }
    $.ajax({
        //url: "valueByCities.do",
        url: "valueByCities_daily.do",
        type: "post",
        data: time,
        success: function (resultData) {
            var result = JSON.parse(resultData);
            var findValue = function(proName, proId){
                for(var i = 0; i < result.length; i ++){
                    if(result[i]._id == proName)
                        return result[i].pm25;
                }
                //匹配前两个地名,主要解决各种自治州全名不一致问题
                for(var i = 0; i < result.length; i ++){
                    if(result[i]._id != null && result[i]._id.substr(0,2) == proName.substr(0,2) &&
                    proName != "朝阳市" &&//北京朝阳区
                    proName != "大兴安岭地区")//北京大兴区
                        return result[i].pm25;
                }
                //匹配地名第一个字:襄阳市与襄樊市
                for(var i = 0; i < result.length; i ++){
                    if(result[i]._id != null &&
                        result[i]._id.substr(0,1) == proName.substr(0,1) &&
                        result[i]._id.substr(0,2) == "襄阳")
                        return result[i].pm25;
                    else if(result[i]._id != null &&
                        result[i]._id.substr(0,1) == proName.substr(0,1) &&
                        result[i]._id.substr(0,2) == "博州")
                        return result[i].pm25;
                    else if(result[i]._id == "昌吉州" &&
                        proName == "巴音郭楞蒙古自治州")
                        return result[i].pm25;
                    else if(result[i]._id == "天津市" &&
                        proId.substr(0,3) == "120")
                    return result[i].pm25;
                    else if(result[i]._id == "重庆市" &&
                        proId.substr(0,3) == "500")
                        return result[i].pm25;
                    else if(result[i]._id == "上海市" &&
                        proId.substr(0,3) == "310")
                        return result[i].pm25;
                    else if(result[i]._id == "北京市" &&
                        proId.substr(0,3) == "110")
                        return result[i].pm25;
                }
            };

            d3.json("maps/china_cities.json",
                function (data) {
                    cities = data.features;
                    for(var i = 0; i < cities.length; i ++){
                        cities[i].pm25 = findValue(cities[i].properties.name, cities[i].id);
                    }
                    cityValueOverlay.addTo(map)
                }
            );
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
        locationLayer.addLayer(L.circle([data[i].latitude, data[i].longitude], 100, optPoint));
    }

}
function buildMeteorologicalStationLayer(data){
    meteorologicalStationLayer.clearLayers();
    for ( var i = 0; i < data.length; ++i) {
        meteorologicalStationLayer.addLayer(L.circle([data[i].latitude, data[i].longitude], 100, meteorologicalStationOption));
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
    if(displayPoint == false){
        $.ajax({
            url:"cities.do",
            type:"post",
            dataType:"json",
            success:function(data){
                filteredData = data;
                buildLocationLayer(filteredData);
            }
        });
        displayPoint = true;
    }else{
        $.ajax({
            url:"cities.do",
            type:"post",
            dataType:"json",
            success:function(data){
                buildLocationLayer(data);
            }
        });
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
    if(freedrawLayer != null){
        freedrawLayer.destroyD3();
        freedrawLayer.destroyPolygon(freedrawLayer);
        map.removeLayer(freedrawLayer);
    }
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

/**
 * 显示过滤后的点,以及控制角度的控件
 */
function displayFilter(){
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
            var newData2 = [];
            var i;
            var result;
            for(i = 0; i < data.length; i ++){
                //use leafletpip to calculate whether points are in the bounds
                result = leafletPip.pointInLayer([data[i].longitude, data[i].latitude], bounds, true);
                if(result.length > 0){
                    newData.push(data[i]);
                }else{
                    //add unfiltered data
                    newData2.push(data[i]);
                }
            }
            filteredData = newData;
            unfilteredData = newData2;

            //buildLocationLayer(newData);
            {
                var filteredCities = "";
                if (filteredData.length != 0) {
                    filteredCities += ("codes=" + filteredData[0].code);
                    if (filteredData.length > 1) {
                        var i;
                        for (i = 1; i < filteredData.length; i++) {
                            filteredCities += ("&codes=" + filteredData[i].code);
                        }
                    }
                }

                $.ajax({
                    url: "monthValue.do",
                    type: "post",
                    data: filteredCities + "&" + "month=" + (new Date(overAllBrush[0]).getUTCMonth() + 1) + "&year=" + new Date(overAllBrush[0]).getUTCFullYear(),
                    success: function (returnData) {
                        var data = JSON.parse(returnData);
                        for (var i = 0; i < filteredData.length; i++) {
                            filteredData[i].pm25 = data[filteredData[i].code];
                        }
                    },
                    async: false
                });

                locationLayer.clearLayers();
                for ( var i = 0; i < filteredData.length; ++i) {
                    var colorNow;
                    if(filteredData[i].pm25 == null || filteredData[i].pm25 == 0){
                        colorNow = "yellow";
                        continue;
                    }else if(filteredData[i].pm25 > 200){
                        colorNow = "#FF0000";
                    }else{
                        colorNow = colorScale(filteredData[i].pm25);
                    }
                    var optNow = {stroke:true, fillColor:colorNow, fill:true, color:"#000000", fillOpacity:1, opacity:1, weight:0.5};
                    locationLayer.addLayer(L.circle([filteredData[i].latitude, filteredData[i].longitude], 10000, optNow));
                }

            }

            linearTime();

            var center = bounds.getBounds().getCenter();
            minDis = Number.MAX_VALUE;
            for (var i = 0; i < unfilteredData.length; i++) {
                var dist = L.latLng(unfilteredData[i].latitude, unfilteredData[i].longitude).distanceTo(center);
                unfilteredData[i].distance = dist;
                if (dist < minDis)
                    minDis = dist;
                var angle = Math.asin((unfilteredData[i].longitude - center.longitude) / dist);
                unfilteredData[i].direction = (angle + Math.PI / 8) % Math.PI / 4;
            }
            maxDis = 0;
            for (var i = 0; i < unfilteredData.length; i++) {
                var dist = L.latLng(unfilteredData[i].latitude, unfilteredData[i].longitude).distanceTo(center);
                unfilteredData[i].distance = dist;
                if (dist > maxDis)
                    maxDis = dist;
                var angle = Math.asin((unfilteredData[i].longitude - center.longitude) / dist);
                unfilteredData[i].direction = (angle + Math.PI / 8) % Math.PI / 4;
            }
            $( "#slider" ).slider( "option", "min", minDis );
            $( "#slider" ).slider( "option", "max", maxDis );
            $("#maxDistance").text(parseInt(maxDis/1000) + "km");
            $("#minDistance").text(parseInt(minDis/1000) + "km");
        },
        async: false
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
            //map.fitBounds(L.latLngBounds(event.latLngs));

        }
    });
    $("#piemenu").css("visibility", "hidden");
    deactiveFreeDraw();//TODO ugly structure

    displayCustomizedFilter();

}

function displayCustomizedFilter(){

    //根据freedraw的情况,给出可以控制的控件
    if(filterControl != null)
        map.removeLayer(filterControl);
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    filterControl = L.d3SvgOverlay(function(sel, proj) {
        var centerScreen = proj.latLngToLayerPoint(center);
        var controller = sel.append("g");
        controller.append("circle")
            .attr("cx", centerScreen.x)
            .attr("cy", centerScreen.y)
            .attr("r", r)
            .attr("stroke", "black")
            .attr("stroke-width", "0px")
            .attr("fill", "gray")
            .attr("fill-opacity", 0.5);
        controller.append("path")
            .attr("d", function(){
                var startX, startY;
                startX = centerScreen.x - r * Math.cos(startAngleControl*Math.PI/180);
                startY = centerScreen.y - r * Math.sin(startAngleControl*Math.PI/180);
                var sX, sY;
                sX = centerScreen.x - (r + distance) * Math.cos(startAngleControl*Math.PI/180);
                sY = centerScreen.y - (r + distance) * Math.sin(startAngleControl*Math.PI/180);
                var s2X, s2Y;
                s2X = centerScreen.x - (r + distance) * Math.cos((startAngleControl+swap)*Math.PI/180);
                s2Y = centerScreen.y - (r + distance) * Math.sin((startAngleControl+swap)*Math.PI/180);
                var s3X, s3Y;
                s3X = centerScreen.x - r * Math.cos((startAngleControl+swap)*Math.PI/180);
                s3Y = centerScreen.y - r * Math.sin((startAngleControl+swap)*Math.PI/180);

                return "M" + startX + " "+ startY + "L" + sX + " " + sY +
                    "A" + (r + distance) + "," + (r + distance) +
                    " 0 0,1 " + s2X + "," + s2Y +
                    "L" + s3X + " " + s3Y +
                    "A" + r + "," + r +
                    " 0 0,0 " + startX + "," + startY + "Z";
                //(rx ry x-axis-rotation large-arc-flag sweep-flag x y)+
            })
            .attr("stroke", "black")
            .attr("stroke-width", "0px")
            .attr("fill", "gray")
            .attr("fill-opacity", 0.5);


        controller.append("path")
            .attr("d", function(){
                var startX, startY;
                startX = centerScreen.x - r * Math.cos((startAngleControl+180)*Math.PI/180);
                startY = centerScreen.y - r * Math.sin((startAngleControl+180)*Math.PI/180);
                var sX, sY;
                sX = centerScreen.x - (r + distance) * Math.cos((startAngleControl+180)*Math.PI/180);
                sY = centerScreen.y - (r + distance) * Math.sin((startAngleControl+180)*Math.PI/180);
                var s2X, s2Y;
                s2X = centerScreen.x - (r + distance) * Math.cos(((startAngleControl+180)+swap)*Math.PI/180);
                s2Y = centerScreen.y - (r + distance) * Math.sin(((startAngleControl+180)+swap)*Math.PI/180);
                var s3X, s3Y;
                s3X = centerScreen.x - r * Math.cos(((startAngleControl+180)+swap)*Math.PI/180);
                s3Y = centerScreen.y - r * Math.sin(((startAngleControl+180)+swap)*Math.PI/180);

                return "M" + startX + " "+ startY + "L" + sX + " " + sY +
                    "A" + (r + distance) + "," + (r + distance) +
                    " 0 0,1 " + s2X + "," + s2Y +
                    "L" + s3X + " " + s3Y +
                    "A" + r + "," + r +
                    " 0 0,0 " + startX + "," + startY + "Z";
                //(rx ry x-axis-rotation large-arc-flag sweep-flag x y)+
            })
            .attr("stroke", "black")
            .attr("stroke-width", "0px")
            .attr("fill", "gray")
            .attr("fill-opacity", 0.5);

    });

    filterControl.addTo(map);
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
    //var totalW = $("#trend").width(), totalH = $("#trend").height();
    //var startTime
    var totalW = 3500, totalH = $("#trend").height();
    var margin = {top: 10, right: 20, bottom: 50, left: 40},
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
        //url:"dayTrends_v2.do",
        type:"post",
        data: cities,
        success: function (returnData) {
            var data = JSON.parse(returnData);
            for(var i = 0; i < data.length; i ++){
                data[i].time = new Date(data[i]._id.year+"-"+data[i]._id.month+"-01");
            }

            var x = d3.time.scale().range([0, width]),
                y = d3.scale.linear().range([height, 0]);

            var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(25),
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
                .interpolate("basis")
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

            //TODO
            var imageDate = [{date:new Date("2013-12-01"), url:"2013-12"},
                {date:new Date("2014-01-01"), url:"2015-01"},
                {date:new Date("2014-02-01"), url:"2015-02"}
                ,{date:new Date("2014-03-01"), url:"2015-03"},
                {date:new Date("2014-04-01"), url:"2015-04"},
                {date:new Date("2014-05-01"), url:"2015-05"}
                ,{date:new Date("2014-06-01"), url:"2015-06"},
                {date:new Date("2014-07-01"), url:"2015-07"},
                {date:new Date("2014-08-01"), url:"2015-08"}
                ,{date:new Date("2014-09-01"), url:"2015-09"},
                {date:new Date("2014-10-01"), url:"2015-09"},
                {date:new Date("2014-11-01"), url:"2015-09"}
                ,{date:new Date("2014-12-01"), url:"2015-09"},
                {date:new Date("2015-01-01"), url:"2015-01"},
                {date:new Date("2015-02-01"), url:"2015-02"}
                ,{date:new Date("2015-03-01"), url:"2015-03"},
                {date:new Date("2015-04-01"), url:"2015-04"},
                {date:new Date("2015-05-01"), url:"2015-05"}
                ,{date:new Date("2015-06-01"), url:"2015-06"},
                {date:new Date("2015-07-01"), url:"2015-07"},
                {date:new Date("2015-08-01"), url:"2015-08"}
                ,{date:new Date("2015-09-01"), url:"2015-09"},
                {date:new Date("2015-10-01"), url:"2015-09"}];
            var imagePanel = context.append("g").attr("id", "image");
            imagePanel.selectAll("image")
                .data(imageDate)
                .enter()
                .append("image")
                .attr("x",function(d){return x(d.date);})
                .attr("y",0)
                .attr("width", 140)
                .attr("height", 140)
                .attr("xlink:href", function(d){return "../imgs/"+ d.url +".png";})//"../imgs/201401.png"
                .on("mouseup", function(){
                    console.log(this);
                    console.log(d3.select(this));

                });

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

    createdetailPanel();
}

/**
 * TODO all repaint should use this function
 */
function repaintAll(){
    //controlCalendar();
    createdetailPanel();
    provinceValueControl();
    cityValueControl();
    controlCluster();
    controlThemeRiver();
}


/**
 * 在屏幕上创建的问题就是div覆盖了地图图层,使得地图不能交互
 * 在右上角绘制circle view即contextRing
 */
function createCircleView() {

    $("#contextRing").empty();
    var detail = d3.select("#contextRing");
    var sel = detail.append("svg").style("width", contextRingOption.canvasW).style("height", contextRingOption.canvasH)
        .attr("id", "circleView");


    var cities = "";
    if(filteredData.length != 0){
        cities += ("codes="+filteredData[0].code);
        if(filteredData.length > 1){
            var i;
            for(i = 1; i < filteredData.length; i ++){
                cities += ("&codes="+filteredData[i].code);
            }
        }
    }

    //计算context ring的path
    var pathContextRing = function(d){
        //var startAngle = Math.PI * 2 * 15 / 16;
        var intervalAngle = Math.PI * 2 / 8;
        var path = "M ";
        var p1X = contextRingOption.centerScreenX + contextRingOption.innerRadius * Math.sin(d.angle);
        var p1Y = contextRingOption.centerScreenY - contextRingOption.innerRadius * Math.cos(d.angle);
        var p2X = contextRingOption.centerScreenX + contextRingOption.innerRadius * Math.sin(d.angle + intervalAngle);
        var p2Y = contextRingOption.centerScreenY - contextRingOption.innerRadius * Math.cos(d.angle + intervalAngle);
        var p3X = contextRingOption.centerScreenX + contextRingOption.outerRadius * Math.sin(d.angle + intervalAngle);
        var p3Y = contextRingOption.centerScreenY - contextRingOption.outerRadius * Math.cos(d.angle + intervalAngle);
        var p4X = contextRingOption.centerScreenX + contextRingOption.outerRadius * Math.sin(d.angle);
        var p4Y = contextRingOption.centerScreenY - contextRingOption.outerRadius * Math.cos(d.angle);
        path += p1X + " ";
        path += p1Y + " A ";
        path += contextRingOption.innerRadius+","+contextRingOption.innerRadius+ " ";
        path += "0 0,1 ";
        path += p2X + ",";
        path += p2Y + " L ";
        path += p3X + " ";
        path += p3Y + " A ";
        path += contextRingOption.outerRadius+","+contextRingOption.outerRadius+ " ";
        path += "0 0,0 ";
        path += p4X + ",";
        path += p4Y + " ";
        path += " Z ";
        var centerXGrid = (p1X + p2X + p3X + p4X) / 4;
        var centerYGrid = (p1Y + p2Y + p3Y + p4Y) / 4;
        //TODO
        octagonLocationScreen[d.dir] = {};
        octagonLocationScreen[d.dir].x = centerXGrid;
        octagonLocationScreen[d.dir].y = centerYGrid;
        octagonPath[d.dir] = path;
        return path;
    };

    //绘制内圈的方法
    var pathInner = function(){
        var path = "M ";
        for(var i = 0; i < 7; i ++) {
            var p1X = contextRingOption.centerScreenX + contextRingOption.innerRadius * Math.sin(parts[i].angle);
            var p1Y = contextRingOption.centerScreenY - contextRingOption.innerRadius * Math.cos(parts[i].angle);
            path += p1X + " ";
            path += p1Y + " L ";
        }
        var p1X = contextRingOption.centerScreenX + contextRingOption.innerRadius * Math.sin(parts[i].angle);
        var p1Y = contextRingOption.centerScreenY - contextRingOption.innerRadius * Math.cos(parts[i].angle);
        path += p1X + " ";
        path += p1Y ;
        path += " Z ";
        return path;
    };

    var contextRingId = function(d){
        return "contextRing" + d.dir;
    }

    var parts = [];
    var startAngle = Math.PI * 2 * 15 / 16;
    var intervalAngle = Math.PI * 2 / 8;
    for(var i = 0; i < 8; i ++){
        var temp = {};
        temp.dir = i;
        temp.angle = startAngle + intervalAngle*i;
        parts.push(temp);
        //startAngle += intervalAngle;
    }
    sel.selectAll("g").data(parts)
        .enter()
        .append("g")
        .attr("id", contextRingId)
        .append("path")
        .attr("d", pathContextRing)
        .attr("fill", "gray")
        .attr('stroke', 'black')
        .attr('fill-opacity', '0.7');

    controlCluster();
}


/**
 * 绘制中心的趋势图
 */
function createdetailPanel(){
    $("#detailPanel").empty();
    var detail = d3.select("#detailPanel");
    var sel = detail.append("svg").style("width", "500px").style("height", "205px");

    var cities = "";
    if (filteredData.length != 0) {
        cities += ("codes=" + filteredData[0].code);
        if (filteredData.length > 1) {
            var i;
            for (i = 1; i < filteredData.length; i++) {
                cities += ("&codes=" + filteredData[i].code);
            }
        }
    }

    //绘制中心的趋势图
    var timeRange = "startTime="+overAllBrush[0]+"&endTime="+overAllBrush[1];
    $.ajax({
        url:"stl.do",
        type:"post",
        data: cities+"&"+timeRange,
        success: function (returnData) {
            var data = JSON.parse(returnData);

            var trend = sel.append("g").attr("id", "trendsCenter")
                .attr("transform", "translate("+"0"+"," + "0" + ")");

            var x = d3.time.scale().range([0, 350]);
            var yY = d3.scale.linear().range([ 200, 150]);
            var yTrend = d3.scale.linear().range([ 150, 100]);
            var yReminder = d3.scale.linear().range([ 100, 50]);
            var ySeasonal = d3.scale.linear().range([ 50, 0]);

            var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(4).tickFormat(d3.time.format("%b%d %H"));
            var yYAxis = d3.svg.axis().scale(yY).orient("left").ticks(4);
            var yTrendAxis = d3.svg.axis().scale(yTrend).orient("left").ticks(4);
            var yReminderAxis = d3.svg.axis().scale(yReminder).orient("left").ticks(4);
            var ySeasonalAxis = d3.svg.axis().scale(ySeasonal).orient("left").ticks(4);

            var lineY = d3.svg.line()
                .interpolate("monotone")
                .x(function (d) {
                    return x(new Date(d.time));
                })
                .y(function (d) {
                    return yY(d.value);
                });
            var lineTrend = d3.svg.line()
                .interpolate("monotone")
                .x(function (d) {
                    return x(new Date(d.time));
                })
                .y(function (d) {
                    return yTrend(d.trend);
                });
            var lineReminder = d3.svg.line()
                .interpolate("monotone")
                .x(function (d) {
                    return x(new Date(d.time));
                })
                .y(function (d) {
                    return yReminder(d.reminder);
                });
            var lineSeasonal = d3.svg.line()
                .interpolate("monotone")
                .x(function (d) {
                    return x(new Date(d.time));
                })
                .y(function (d) {
                    return ySeasonal(d.seasonal);
                });

            var color = d3.scale.category10();
            //color.domain(d3.keys(data[0]).filter(function (key) {
            //    return key === "pm25";
            //}));

            x.domain(d3.extent(data.map(function (d) {
                return new Date(d.time);
            })));

            //TODO 固定y轴最大数值
            yY.domain(d3.extent(data.map(function (d) {
                return d.value;
            })));
            yTrend.domain(d3.extent(data.map(function (d) {
                return d.trend;
            })));
            yReminder.domain(d3.extent(data.map(function (d) {
                return d.reminder;
            })));
            ySeasonal.domain(d3.extent(data.map(function (d) {
                return d.seasonal;
            })));


            var brush = d3.svg.brush()
                .x(x)
                .on("brush", brushed)
                .on("brushend", brushend);

            function brushed() {
            }
            function brushend(){
                //do not paint when brush doesn't change
                if(detailBrush != null && detailBrush[0] == brush.extent()[0] && detailBrush[1] == brush.extent()[1])
                    return;
                detailBrush = brush.empty() ? x.domain() : brush.extent();
                //clusterWithCorrelation();
                //controlThemeRiver();
                //controlLLCGroup();
                displayLLCView();
                controlDetailWind();
            }

            //绘制border
            trend.append("g")
                .append("line")
                .attr("x1", 0)
                .attr("y1", 100)
                .attr("x2", 350)
                .attr("y2", 100)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8);
            trend.append("g")
                .append("line")
                .attr("x1", 0)
                .attr("y1", 50)
                .attr("x2", 350)
                .attr("y2", 50)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8);
            trend.append("g")
                .append("line")
                .attr("x1", 0)
                .attr("y1", 150)
                .attr("x2", 350)
                .attr("y2", 150)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8);
            trend.append("g")
                .append("line")
                .attr("x1", 0)
                .attr("y1", 200)
                .attr("x2", 350)
                .attr("y2", 200)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8);
            trend.append("g")
                .append("line")
                .attr("x1", 350)
                .attr("y1", 0)
                .attr("x2", 350)
                .attr("y2", 200)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8);
            trend.append("g")
                .append("line")
                .attr("x1", 350)
                .attr("y1", 200)
                .attr("x2", 0)
                .attr("y2", 200)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8);

            trend.append("g")
                .attr("class", "x axis")
                .attr("id", "detailBrush")
                .attr("transform", "translate("+0+"," + 0 + ")")
                .call(xAxis)
                .append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("y", 0)
                .attr("height", 200);
            d3.select("#detailBrush").on("mouseover", function(){map.dragging.disable()});
            d3.select("#detailBrush").on("mouseout", function(){map.dragging.enable()});

            trend.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+0+"," + 0 + ")")
                .call(yYAxis);
            trend.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+0+"," + 0 + ")")
                .call(ySeasonalAxis);
            trend.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+0+"," + 0 + ")")
                .call(yReminderAxis);
            trend.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+0+"," + 0 + ")")
                .call(yTrendAxis);

            trend.append("path")
                .datum(data)
                .attr('class', 'line')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8)
                .attr('d', lineY);
            trend.append("path")
                .datum(data)
                .attr('class', 'line')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8)
                .attr('d', lineTrend);
            trend.append("path")
                .datum(data)
                .attr('class', 'line')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8)
                .attr('d', lineSeasonal);
            trend.append("path")
                .datum(data)
                .attr('class', 'line')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('opacity', 0.8)
                .attr('d', lineReminder);


        }});


}


/**
 * 绘制站点,在右侧的contextRing面板上
 */
function drawScatterGroup(){
    var circleOption = contextRingOption;
    var sel = d3.select("#circleView");
    if(d3.select("#scattergroup")[0][0] != null)
        $("#scattergroup").remove();
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    //绘制站点
    if ($("#controlCluster").is(":checked")) {
        //如果聚类,则不用绘制点
    } else {
        var unfilteredCities = "";
        if (unfilteredData.length != 0) {
            unfilteredCities += ("codes=" + unfilteredData[0].code);
            if (unfilteredData.length > 1) {
                var i;
                for (i = 1; i < unfilteredData.length; i++) {
                    unfilteredCities += ("&codes=" + unfilteredData[i].code);
                }
            }
        }

        $.ajax({
            url: "monthValue.do",
            type: "post",
            data: unfilteredCities + "&" + "month=" + (new Date(overAllBrush[0]).getUTCMonth() + 1) + "&year=" + new Date(overAllBrush[0]).getUTCFullYear(),
            success: function (returnData) {
                var data = JSON.parse(returnData);
                for (var i = 0; i < unfilteredData.length; i++) {
                    unfilteredData[i].pm25 = data[unfilteredData[i].code];
                }
            },
            async: false
        });
        var stationX = function (d) {
            var r = (circleOption.innerRadius + (d.distance - minDis) / (maxDis - minDis) * (circleOption.outerRadius - circleOption.innerRadius));
            return circleOption.centerScreenX + r *
                (d.longitude - center.lng) /
                Math.sqrt((d.latitude - center.lat) * (d.latitude - center.lat) + (d.longitude - center.lng) * (d.longitude - center.lng));
        }
        var stationY = function (d) {
            var r = (circleOption.innerRadius + (d.distance - minDis) / (maxDis - minDis) * (circleOption.outerRadius - circleOption.innerRadius));
            return circleOption.centerScreenY - r *
                (d.latitude - center.lat) /
                Math.sqrt((d.latitude - center.lat) * (d.latitude - center.lat) + (d.longitude - center.lng) * (d.longitude - center.lng));

        }

        sel.append("g")
            .attr("id", "scattergroup")
            .selectAll(".contextScatter")
            .data(unfilteredData)
            .enter()
            .append("circle")
            .filter(function (d) {

                return d.distance > minDis && d.distance < maxDis;
            })
            .attr('r', function (d) {
                return 4;
            })
            .attr('cx', stationX)
            .attr('cy', stationY)
            .attr('stroke', function (d) {
                return "#000000";
                ////TODO
                //if(d.pm25 == null)
                //    return colorScale(0);
                //return colorScale(d.pm25);
            })
            .attr('fill', function (d) {
                //TODO
                if(d.pm25 == null)
                    return colorScale(0);
                return colorScale(d.pm25);
            })
            .attr('stroke-width', 0.5)
            .on('mouseover', function(d){
                //console.log("over:"+d.pm25);
            });
    }
}

/**
 * create the grids view
 */
function createGridsView(){
    initGrids();
    //构建post参数
    var para = "";
    for (var i = 0; i < grids.length; i++) {
        for (var j = 0; j < grids[0].length; j++) {
            para += ("latitudes="+(grids[i][j].west + grids[i][j].east)/2 + "&");
            para +=("longitudes="+(grids[i][j].north + grids[i][j].west)/2+ "&");
        }
    }
    $.ajax({
        url: "rbfScalar.do",
        type: "post",
        dataType: "json",
        data:para,
        success: function (data) {
            //构建grid view的所有grids
            gridsView = L.d3SvgOverlay(function (sel, proj) {
                for (var i = 0; i < grids.length; i++) {
                    for (var j = 0; j < grids[0].length; j++) {
                        var northernWest = proj.latLngToLayerPoint(L.latLng(grids[i][j].north, grids[i][j].west));
                        var northernEast = proj.latLngToLayerPoint(L.latLng(grids[i][j].north, grids[i][j].east));
                        var southernEast = proj.latLngToLayerPoint(L.latLng(grids[i][j].south, grids[i][j].east));
                        var southernWest = proj.latLngToLayerPoint(L.latLng(grids[i][j].south, grids[i][j].west));

                        var points = northernWest.x + "," + northernWest.y + " " + northernEast.x + "," + northernEast.y +
                            " " + southernEast.x + "," + southernEast.y + " " + southernWest.x + "," + southernWest.y;
                        sel.append("polygon")
                            .attr("points", points)
                            .attr("fill", colorScale(data[i*grids[0].length+j]))
                            //.attr("stroke", "black")
                            .attr("stroke-width", "0")
                            .attr('fill-opacity', '0.5');
                    }
                }
            });
            gridsView.addTo(map);
        }
    });
    controlWinds();
}

/**
 * create the wind view
 * 每个grid里根据数据绘制wind
 */
function createWindsView(){
    initGrids();

    windsView = L.d3SvgOverlay(function (sel, proj) {
        //风向的箭头
        sel.append("svg:marker")
            .attr("id", "triangle")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", "0")
            .attr("refY", "5")
            .attr("markerWidth", "3")
            .attr("markerHeight", "3")
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z");

        for (var i = 0; i < grids.length; i=i+gridTimes) {
            for (var j = 0; j < grids[0].length; j=j+gridTimes) {
                var wind = windPath(Math.random() * 360);
                var start = proj.latLngToLayerPoint(L.latLng(grids[i][j].north - wind.startY, grids[i][j].west + wind.startX));
                var end = proj.latLngToLayerPoint(L.latLng(grids[i][j].north - wind.endY, grids[i][j].west + wind.endX));

                sel.append("line")
                    .attr("x1", start.x)
                    .attr("y1", start.y)
                    .attr("x2", end.x)
                    .attr("y2", end.y)
                    .attr("marker-end", "url(#triangle)")
                    .attr("stroke", "black")
                    .attr("stroke-width", function(){return Math.random()*8;})
                    .attr('fill-opacity', '0.8');
                //sel.transition().duration(500)
            }
        }
    });
    windsView.addTo(map);
}

/**
 * 显示LLCView
 */
function displayLLCView(){
    if(detailBrush == null || freedrawEvent.latLngs == null){
        return;//TODO
    }
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    //$("#llcBar").show();//
    $("#llcBar").empty();
    var d = d3.select("#llcBar");
    var margin = {top: 10, right: 20, bottom: 50, left: 40};
    var width = 600, height = 450;
    var svg = d.append("svg")
        .attr("width", width+margin.left+margin.right)
        .attr("height", height+margin.top+margin.bottom)
        .attr("id", "llcgroup")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var HOUR_INTERVAL = 72;

    //根据最大距离\角度\方向过滤出相关站点
    //根据选择的趋势进行聚类
    //把correlation结果进行后台计算并返回,返回包括分层结果
    //显示LLCView
    //地图显示动态风的结果?
    var gapLevel = 20;

    //TODO 如果cluster为空应先创建cluster
    if(clusterResult == null && $("#controlCluster").is(":checked")){
        controlCluster();
    }
    var codes = "";
    for(var i = 0; i < filteredData.length; i ++){
        codes += ("codes="+filteredData[i].code + "&");
    }

    $.ajax({
        url: "correlation2.do",
        type:"post",
        data: "cluster="+
        JSON.stringify(clusterResult) +
        "&startTime="+new Date(detailBrush[0])+
        "&endTime="+new Date(detailBrush[1])+
        "&startAngle="+startAngleControl +
        "&swap="+swap +
        "&" + codes,
        success: function (returnData) {
            var data = JSON.parse(returnData);
            clusterResult = data;

            //统计各个level的cluster数目
            var maxLevel = 4;
            var countLevelPositive = [];
            var countLevelNegative = [];
            for(var i = 0; i < maxLevel; i ++){
                countLevelPositive[i] = 0;
                countLevelNegative[i] = 0;
            }
            for(var i = 0; i < clusterResult.length; i ++){
                if(clusterResult[i].sign > 0){
                    countLevelPositive[clusterResult[i].level] ++;
                }else{
                    countLevelNegative[clusterResult[i].level] ++;
                }
            }
            var heightBar = (height - 8 * gapLevel) / (maxLevel*2+1);

            var x = d3.time.scale()
                .range([0, width]);
            var y = d3.scale.linear()
                .range([height, 0]);
            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

            x.domain([new Date(detailBrush[0].getTime() - 1000*60*60*HOUR_INTERVAL), new Date(detailBrush[0].getTime() + 1000*60*60*HOUR_INTERVAL)]);

            svg.append("g").attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);
            svg.selectAll(".positiveRect").data(countLevelPositive)
                .enter()
                .append("g")
                .attr("id", function(d, i){
                    return "positive"+ i;
                })
                .attr("transform", function(d, i){
                    return "translate(" + "0" +","+ (maxLevel-(i+1)) * (heightBar+gapLevel) + ")";
                })
                .append("rect")
                .attr("width", width)
                .attr("height", heightBar)
                .style("stroke", "black")
                .style("fill-opacity", "0.5")
                .style("fill", "#DDDDDD");

            svg.append("g")
                .attr("id", "original")
                .attr("transform", function(d, i){
                    return "translate(" + "0" +","+ maxLevel * (heightBar+gapLevel) + ")";
                })
                .append("rect")
                .attr("width", width)
                .attr("height", heightBar)
                .style("stroke", "black")
                .style("fill-opacity", "0.5")
                .style("fill", "#DDDDDD");

            svg.selectAll(".negativeRect").data(countLevelNegative)
                .enter()
                .append("g")
                .attr("id", function(d, i){
                    return "negative"+ i;
                })
                .attr("transform", function(d, i){
                    return "translate(" + "0" +","+ (maxLevel + 1 + i) * (heightBar+gapLevel) + ")";
                })
                .append("rect")
                .attr("width", width)
                .attr("height", heightBar)
                .style("stroke", "black")
                .style("fill-opacity", "0.5")
                .style("fill", "#DDDDDD");

            var widthOneHour = x(new Date(1000*60*60))-x(new Date(0));
            var countLevelPositiveNow = [];
            var countLevelNegativeNow = [];
            for(var i = 0; i < maxLevel; i ++){
                countLevelPositiveNow[i] = 0;
                countLevelNegativeNow[i] = 0;
            }

            for(var i = 0; i < clusterResult.length; i ++){
                var d = clusterResult[i];
                var levelRect;
                var heightOneCluster, yOneCluster ;
                if(d.sign < 0){
                    levelRect = svg.select("#negative"+ d.level);
                    levelRect.append("g")
                        .attr("id", "levelrectneg"+countLevelNegativeNow[d.level]);
                    heightOneCluster = heightBar / countLevelNegative[d.level];
                    yOneCluster = heightOneCluster * countLevelNegativeNow[d.level];
                    countLevelNegativeNow[d.level] ++;
                }
                else{
                    levelRect = svg.select("#positive" + d.level);
                    levelRect.append("g")
                        .attr("id", "levelrectpos"+countLevelPositiveNow[d.level]);
                    heightOneCluster = heightBar / countLevelPositive[d.level];
                    yOneCluster = heightOneCluster * countLevelPositiveNow[d.level];
                    countLevelPositiveNow[d.level] ++;
                }


                for(var j = 0; j < d.lagArray.length; j ++){
                    var xPos = x(new Date(detailBrush[0].getTime() - 1000*60*60*d.lagArray[j]));
                    if(xPos < 0)
                        continue;
                    if(d.pvalueArray[j] >= 0.05 || d.correlationArray == null){
                        levelRect.append("rect")
                            .attr("x", xPos)
                            .attr("y", yOneCluster)
                            .attr("width", widthOneHour)
                            .attr("height", heightOneCluster)
                            .style("fill-opacity", "1")
                            .style("fill", colorLLCGroup(0));
                        continue;
                    }else{
                    levelRect.append("rect")
                        .attr("x", xPos)
                        .attr("y", yOneCluster)
                        .attr("width", widthOneHour)
                        .attr("height", heightOneCluster)
                        .style("fill-opacity", "1")
                        .style("fill", colorLLCGroup(d.correlationArray[j]));
                    }
                }
            }

            var cities = "";
            if (filteredData.length != 0) {
                cities += ("codes=" + filteredData[0].code);
                if (filteredData.length > 1) {
                    var i;
                    for (i = 1; i < filteredData.length; i++) {
                        cities += ("&codes=" + filteredData[i].code);
                    }
                }
            }


            //绘制中间的趋势
            var timeRange = "startTime=" + new Date(detailBrush[0].getTime() - 1000*60*60*HOUR_INTERVAL)+
                "&endTime=" + new Date(detailBrush[0].getTime() + 1000*60*60*HOUR_INTERVAL);
            $.ajax({
                url: "stl.do",
                type: "post",
                data: cities + "&" + timeRange,
                success: function (returnData) {
                    var data = JSON.parse(returnData);

                    //中间的
                    var yY = d3.scale.linear().range([heightBar, 0]);

                    var lineY = d3.svg.line()
                        .interpolate("monotone")
                        .x(function (d) {
                            return x(new Date(d.time));
                        })
                        .y(function (d) {
                            return yY(d.value);
                        });


                    //TODO 固定y轴最大数值
                    yY.domain(d3.extent(data.map(function (d) {
                        return d.value;
                    })));

                    d3.select("#original").append("rect")
                        .attr("x", x(detailBrush[0]))
                        .attr("y", 0)
                        .attr("width", (x(detailBrush[1]) > x(new Date(detailBrush[0].getTime() + 1000*60*60*HOUR_INTERVAL)) ?
                            x(new Date(detailBrush[0].getTime() + 1000*60*60*HOUR_INTERVAL))-x(detailBrush[0]) :
                            x(detailBrush[1]) -x(detailBrush[0])))
                        .attr("height", heightBar)
                        .style("fill-opacity", "0.5")
                        .style("fill", "#FF0000");

                    d3.select("#original").append("path")
                        .datum(data)
                        .attr('class', 'line')
                        .attr('stroke', 'black')
                        .attr('stroke-width', 1)
                        .attr('opacity', 0.8)
                        .attr('d', lineY);

                }
            });
        }
    });

}

function cluster(){
    clusterFilter();
    clusterContextRing();
}

/**将unfiltereddata进行聚类
 * 首先根据city区域进行聚类
 * 然后根据时间相似性进行聚类
 */
function clusterFilter(){
    if(clusterLayer != null)
        map.removeLayer(clusterLayer);
    sizeScreen = map.getPixelBounds().getSize();
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    var centerX, centerY, sumX = 0, sumY = 0;
    for(var i = 0; i < freedrawEvent.latLngs[0].length; i ++){
        sumX += freedrawEvent.latLngs[0][i].lng;
        sumY += freedrawEvent.latLngs[0][i].lat;
    }
    centerX = sumX / freedrawEvent.latLngs[0].length;
    centerY = sumY / freedrawEvent.latLngs[0].length;

    var param = "";
    for(var i = 0; i < filteredData.length; i ++){
        param += ("codes="+filteredData[i].code + "&");
    }
    param += "maxDistance="+maxDis+"&";
    param += "minDistance="+minDis+"&";
    param += "centerLon=" + centerX+"&";
    param += "centerLat=" + centerY+"&";
    param += "startAngle="+ startAngleControl + "&";
    param += "swap=" + swap + "&";
    param += "startTime="+overAllBrush[0]+"&endTime="+overAllBrush[1];
    $.ajax({
        //url:"newclusterWithWind.do",
        url:"clusterwithfilter.do",
        type:"post",
        data: param,
        success: function (returnData) {
            var data = JSON.parse(returnData);
            clusterResult = data;

            for(var i = 0; i < data.length; i ++){
                data[i].distance = L.latLng(data[i].centerY, data[i].centerX).distanceTo(center);
            }

            clusterLayer = L.d3SvgOverlay(function(sel, proj) {

                var stationX = function (d) {
                    return proj.latLngToLayerPoint(L.latLng(d.centerY, d.centerX)).x;
                }
                var stationY = function (d) {
                    return proj.latLngToLayerPoint(L.latLng(d.centerY, d.centerX)).y;
                }

                sel.append("g").selectAll(".clusterWind").data(data)
                    .enter()
                    .append("svg:marker")
                    .attr("id", function(d){return "triangle"+ d.cluster[0].code;})
                    .attr("viewBox", "0 0 15 10")
                    .attr("refX", "0")
                    .attr("refY", "3")
                    .attr("markerWidth", "3")
                    .attr("markerHeight", "3")
                    .attr("orient", function(d){return d.dir+"deg";})
                    .append("path")
                    .attr("d", "M 0 0 L 10 3 L 0 6 z");

                var clusterCircles = sel.selectAll(".cluster").data(data)
                    .enter()
                    .append("g")
                    .attr('id', function(d){return d.id;});

                circles = clusterCircles.append("circle")
                    .attr('r', function (d) {
                        return 5;//2+(d.cluster.length-1)*2;
                    })
                    .attr('id', function(d){return d.id;})//能使用同一个id 么?
                    .attr('cx', stationX)
                    .attr('cy', stationY)
                    .attr('fill', function(d){
                        //根据数值返回颜色
                        for(var i = 0; i < unfilteredData.length; i ++){
                            if(d.cluster[0].code == unfilteredData[i].code)
                                return colorScale(unfilteredData[i].pm25);
                        }
                        return 'yellow';
                    })
                    .attr('opacity', '1')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 0.5);
                clusterCircles.append("line")
                    .attr('class', 'clusterwind')
                    .attr('x1', stationX)
                    .attr('y1', stationY)
                    .attr("x2", stationX)
                    .attr("y2", stationY)
                    .attr("marker-end", function(d){return "url(#triangle"+d.cluster[0].code+")";})
                    .attr("stroke", "black")
                    .attr("stroke-width", function(d){return (2 + d.spd/2);})
                    .attr('fill-opacity', '0.8')
                    .attr("visibility", "hidden");

            });
            clusterLayer.addTo(map);
        },
        async:false
    });


}

/**
 * 右上角的聚类
 */
function clusterContextRing(){

    //绘制右上角的cluster
    var sel = d3.select("#scattergroup");
    $("#scattergroup").empty();
    if(sel[0][0] == null)
        sel = d3.select("#circleView").append("g")
            .attr("id", "#scattergroup");

    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    var centerX, centerY, sumX = 0, sumY = 0;
    for(var i = 0; i < freedrawEvent.latLngs[0].length; i ++){
        sumX += freedrawEvent.latLngs[0][i].lng;
        sumY += freedrawEvent.latLngs[0][i].lat;
    }
    centerX = sumX / freedrawEvent.latLngs[0].length;
    centerY = sumY / freedrawEvent.latLngs[0].length;

    var param = "";
    for(var i = 0; i < filteredData.length; i ++){
        param += ("codes="+filteredData[i].code + "&");
    }
    param += "maxDistance="+maxDis+"&";
    param += "centerLon=" + centerX+"&";
    param += "centerLat=" + centerY+"&";
    param += "startTime="+overAllBrush[0]+"&endTime="+overAllBrush[1];
    $.ajax({
        url:"newclusterWithWind.do",
        type:"post",
        data: param,
        success: function (returnData) {
            var data = JSON.parse(returnData);
            //clusterResult = data;

            for(var i = 0; i < data.length; i ++){
                data[i].distance = L.latLng(data[i].centerY, data[i].centerX).distanceTo(center);
            }

            var stationX = function (d) {
                var r = (contextRingOption.innerRadius + (d.distance - minDis) / (maxDis - minDis) * (contextRingOption.outerRadius - contextRingOption.innerRadius));
                return contextRingOption.centerScreenX + r *
                    (d.centerX - center.lng) /
                    Math.sqrt((d.centerY - center.lat) * (d.centerY - center.lat) + (d.centerX - center.lng) * (d.centerX - center.lng));
            }
            var stationY = function (d) {
                var r = (contextRingOption.innerRadius + (d.distance - minDis) / (maxDis - minDis) * (contextRingOption.outerRadius - contextRingOption.innerRadius));
                return contextRingOption.centerScreenY - r *
                    (d.centerY - center.lat) /
                    Math.sqrt((d.centerY - center.lat) * (d.centerY - center.lat) + (d.centerX - center.lng) * (d.centerX - center.lng));
            }

            sel.append("g").selectAll(".clusterWind").data(data)
                .enter()
                .append("svg:marker")
                .attr("id", function(d){return "triangle"+ d.cluster[0].code;})
                .attr("viewBox", "0 0 15 10")
                .attr("refX", "0")
                .attr("refY", "3")
                .attr("markerWidth", "3")
                .attr("markerHeight", "3")
                .attr("orient", function(d){return d.dir+"deg";})
                .append("path")
                .attr("d", "M 0 0 L 10 3 L 0 6 z");

            var clusterCircles = sel.selectAll(".cluster").data(data)
                .enter()
                .append("g")
                .attr('id', function(d){return d.id;});

            circles = clusterCircles.append("circle")
                .attr('r', function (d) {
                    return 4+(d.cluster.length-1)*3;//d.cluster.length*5;
                })
                .attr('id', function(d){return d.id;})//能使用同一个id 么?
                .attr('cx', stationX)
                .attr('cy', stationY)
                .attr('fill', function(d){
                    //根据数值返回颜色
                    for(var i = 0; i < unfilteredData.length; i ++){
                        //if(unfilteredData[i].pm25 == null)
                        //    return "yellow";
                        if(d.cluster[0].code == unfilteredData[i].code)
                            return colorScale(unfilteredData[i].pm25);
                    }
                    //if(d.cluster[0]pm25 == null)
                    //    return colorScale(0);
                    //return colorScale(d.pm25);
                    return 'yellow';
                })
                .attr('opacity', '1')
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5);
            clusterCircles.append("line")
                .attr('class', 'clusterwind')
                .attr('x1', stationX)
                .attr('y1', stationY)
                .attr("x2", stationX)
                .attr("y2", stationY)
                .attr("marker-end", function(d){return "url(#triangle"+d.cluster[0].code+")";})
                .attr("stroke", "black")
                .attr("stroke-width", function(d){return (2 + d.spd/2);})
                .attr('fill-opacity', '0.8')
                .attr("visibility", "hidden");
        },
        async:true
    });
}

/**
 * 聚类,然后绘制themeriver
 */
//TODO
function clusterAndThemeRiver(){
    for(var i = 0; i < 8; i ++){
        $("#themeriver"+i).empty();
    }
    if(themeLayer != null){
        for(var i = 0; i < 8; i ++){
            if(themeLayer[i] != null)
                map.removeLayer(themeLayer[i]);
        }
    }
    colorrange = ["#A6BDDB", "#D0D1E6", "#F1EEF6"];//, "#045A8D", "#2B8CBE", "#74A9CF"];
    var strokecolor = colorrange[0];
    var margin = {top: 0, right: 0, bottom: 20, left: 10};

    var format = d3.time.format("%m/%d/%y");

    var width = 150;//TODO
    var height = 100;//TODO

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height - 10, 0]);

    var z = d3.scale.ordinal()
        .range(colorrange);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(d3.time.weeks);

    var yAxis = d3.svg.axis()
        .scale(y);

    var order = [];
    var stack = d3.layout.stack()

        .offset("silhouette")
        .values(function (d) {
            //console.log("value:"+ d.values);
            return d.values;
        })
        .x(function (d) {
            //console.log("time:"+ d.time);
            return d.time;
        })
        .y(function (d) {
            //console.log("pm25:"+ d.pm25);
            return d.pm25;
        });
        //.order(function(d){
        //    //根据距离远近进行排序
        //    return order;
        //});

    var nest = d3.nest()
        .key(function (d) {
            return d.code;
        });

    var area = d3.svg.area()
        .interpolate("cardinal")
        .x(function (d) {
            return x(d.time);
        })
        .y0(function (d) {
            return y(d.y0);
        })
        .y1(function (d) {
            return y(d.y0 + d.y);
        });
    var param = [];
    for(var i = 0; i < 8; i ++){
        param[i] = "";
    }
    //TODO 只取cluster中的第一个station
    for(var i = 0; i < clusterResult.length; i ++){
        //param[clusterResult[i].angle] += "&cities="+clusterResult[i].cluster[0].city;
        //for(var j = 0; j < clusterResult[i].cluster.length; j ++){
        //if(clusterResult[i].correlation > COR_THREADHOOD && clusterResult[i].pvalue < 0.05)
            param[clusterResult[i].angle] += ("&codes="+clusterResult[i].cluster[0].code)
        //}
    }
    for(var i = 0; i < 8; i ++){
        //TODO 把结束时间调整至detailBrush,但不是很恰当
        var s = new Date(detailBrush[0]);
        var e = new Date(detailBrush[1]);
        //var nd = detailBrush[0];
        param[i] += "&startTime="+(new Date(s.setHours(s.getHours()-72)))+"&endTime="+(new Date(e.setHours(e.getHours()+72)));
        //param[i] += "&startTime="+overAllBrush[0]+"&endTime="+detailBrush[1];
        param[i] += "&index="+i;
    }


    var sel = d3.select("#circleView");
    //Uncaught TypeError: Cannot read property '1' of undefined
    //https://github.com/shutterstock/rickshaw/issues/108
    for(var i = 0; i < 8; i ++){
        $.ajax({
            url:"themeriverdata2.do",
            type:"post",
            data: param[i]+"&cluster=" + JSON.stringify(clusterResult),
            success: function (returnData) {
                //themeLayer[i] = L.d3SvgOverlay(function(sel, proj) {
                if (returnData == null || returnData == "")
                    return;
                var dataAll = JSON.parse(returnData);
                var data = dataAll.result;
                var dataLagCor = dataAll.lag;

                data.forEach(function (d) {
                    d.time = new Date(d.time);
                    //d.value = +d.pm25;
                });
                //var g = d3.select("#themeriver" + i).style("left", (octagonLocationScreen[dataAll.index].x - 140) + "px")
                //    .style("top", (octagonLocationScreen[dataAll.index].y - 120 ) + "px");
                var g = sel.append("g")
                    .attr("transform","translate("+(octagonLocationScreen[dataAll.index].x - 100)+","+(octagonLocationScreen[dataAll.index].y - 60 )+")")
                    .attr("class", "themeriver");
                var svg = g.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var entries = nest.entries(data);
                //输入entries
                var getOrder = function(data){//返回order
                    //TODO 计算center的方法修改!!!!
                    var center = L.latLng(filteredData[0].latitude, filteredData[0].longitude);
                    var dis = [];
                    for(var i = 0; i < data.length; i ++){
                        dis[i] = L.latLng(data[i].values[0].lat, data[i].values[0].lon).distanceTo(center);
                    }
                    //根据距离远近给出order[100,20,200,300]返回[1,0,2,3]
                    var result = [];
                    for(var i = 0; i < data.length; i ++){
                        var index = dis.indexOf(dis.min());
                        result[index] = i;
                        dis[index] = Number.MAX_VALUE;
                    }
                    return result;
                };

                order = getOrder(entries);
                var newEntries = [];
                {
                    //reorder entries
                    for(var i = 0; i < order.length; i ++){
                        var index = order.indexOf(i);
                        newEntries.push(entries[index]);
                    }
                }


                var layers = stack(newEntries);

                x.domain(d3.extent(data, function (d) {
                    return d.time;
                }));
                y.domain([0, d3.max(data, function (d) {
                    return d.y0 + d.y;
                })]);

                //过滤后的detailBrush在整个时间上占的比例
                var xStartPercent = x(detailBrush[0]) / width;
                var xEndPercent = x(detailBrush[1]) / width;

                //id="grad1" x1="0%" y1="0%" x2="100%" y2="0%"
                var grad = svg.selectAll(".gradient")
                    .data(dataLagCor)
                    .enter().append("defs")
                    .append("linearGradient")
                    .attr("id", function(d){return "lag"+d.code;})
                    .attr("x1", "0%")
                    .attr("y1", "100%")
                    .attr("x2", "100%")
                    .attr("y2", "100%");
                //<stop offset="50%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
                //<stop offset="51%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
                grad.append("stop")
                    .attr("offset", function(d){
                        var nd = new Date(detailBrush[0]);
                        nd.setHours(nd.getHours() - d.lag);
                        return x(nd) / width;})
                    .attr("stop-color", function(d, i ){return z(i);})
                    .attr("stop-opacity", 1);
                grad.append("stop")
                    .attr("offset", function(d){
                        var nd = new Date(detailBrush[0]);
                        nd.setHours(nd.getHours() - d.lag);
                        return x(nd) / width+0.001;})
                    .attr("stop-color", function(d){
                        //if(d.lag < 0)
                        //return colorScaleCorLag(d.cor);
                        //else
                        return colorScaleCor(d.cor);
                    })
                    .attr("stop-opacity", 1);
                grad.append("stop")
                    .attr("offset", function(d){
                        var nd = new Date(detailBrush[1]);
                        nd.setHours(nd.getHours() - d.lag);
                        return x(nd) / width ;})
                    .attr("stop-color", function(d){
                        //if(d.lag < 0)
                        //    return colorScaleCorLag(d.cor);
                        //else
                            return colorScaleCor(d.cor);
                    })//TODO
                    .attr("stop-opacity", 1);
                grad.append("stop")
                    .attr("offset", function(d){
                        var nd = new Date(detailBrush[1]);
                        nd.setHours(nd.getHours() - d.lag);
                        return x(nd) / width + 0.001; })
                    .attr("stop-color", function(d, i){return z(i);})
                    .attr("stop-opacity", 1);


                svg.selectAll(".layer")
                    .data(layers)
                    .enter().append("path")
                    .attr("class", "layer")
                    .attr("d", function (d) {
                        return area(d.values);
                    })
                    .style("fill", function (d, i) {
                        return "url(#"+"lag"+ d.key+")";
                        //console.log("d:"+i+":"+z(i));
                        //return z(i);
                    }).on("mouseover", function(d) {
                        if(d.values[0] == null)
                            return;
                        var cor = 0;
                        var lag = 0;
                        var city = "";
                        for(var i = 0; i < clusterResult.length; i ++){
                            for(var j = 0; j < clusterResult[i].cluster.length; j ++){
                                if(clusterResult[i].cluster[j].code == d.key) {
                                    cor = clusterResult[i].correlation;
                                    lag = clusterResult[i].lag;
                                    city = clusterResult[i].cluster[j].city;
                                    break;
                                }
                            }
                            if(cor != 0)
                                break;
                        }
                        var div = d3.select("#tooltip");
                        div.transition()
                            .duration(100)
                            .style("opacity", .9);
                        div	.html(city +":"+ parseFloat(cor).toFixed(2)+":"+(parseInt(lag)))
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                        //console.log(d.values[0].city    );
                    }).on("mouseout", function(d) {
                        var div = d3.select("#tooltip");
                        div.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                //<line x1="0" y1="0" x2="200" y2="200" style="stroke:rgb(255,0,0);stroke-width:2" />
                //框出选择的区域
                svg.append("line")
                    .attr("x1", x(detailBrush[0]))
                    .attr("y1", "0")
                    .attr("x2", x(detailBrush[0]))
                    .attr("y2", "150")
                    .attr("stroke", "rgb(0, 0, 0)")
                    .attr("stroke-width", "1");
                svg.append("line")
                    .attr("x1", x(detailBrush[1]))
                    .attr("y1", "0")
                    .attr("x2", x(detailBrush[1]))
                    .attr("y2", "150")
                    .attr("stroke", "rgb(0, 0, 0)")
                    .attr("stroke-width", "1");
                //});
                //themeLayer[i].addTo(map);

            },
            async:false
        });
    }
    //themeLayer.addTo(map);
}

/**
 * 把themeriver合并成一个大的
 */
function groupThemeRiver(){

    colorrange = ["#A6BDDB", "#D0D1E6", "#F1EEF6"];//, "#045A8D", "#2B8CBE", "#74A9CF"];
    var strokecolor = colorrange[0];
    var margin = {top: 20, right: 40, bottom: 30, left: 30};

    var format = d3.time.format("%m/%d/%y");

    var width = 300;//TODO
    var height = 600;//TODO

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height - 10, 0]);

    var z = d3.scale.ordinal()
        .range(colorrange);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(d3.time.weeks);

    var yAxis = d3.svg.axis()
        .scale(y);

    var order = [];
    var stack = d3.layout.stack()
        .order(function(d){
            //根据距离远近进行排序
            return order;
        })
        .offset("wiggle")
        .values(function (d) {
            //console.log("value:"+ d.values);
            return d.values;
        })
        .x(function (d) {
            //console.log("time:"+ d.time);
            return d.time;
        })
        .y(function (d) {
            //console.log("pm25:"+ d.pm25);
            return d.pm25;
        });

    var nest = d3.nest()
        .key(function (d) {
            return d.code;
        });

    var area = d3.svg.area()
        .interpolate("cardinal")
        .x(function (d) {
            return x(d.time);
        })
        .y0(function (d) {
            return y(d.y0);
        })
        .y1(function (d) {
            return y(d.y0 + d.y);
        });
    var param = "";
    //TODO 只取cluster中的第一个station
    for(var i = 0; i < clusterResult.length; i ++){
        if(clusterResult[i].correlation > COR_THREADHOOD && clusterResult[i].pvalue < 0.05)
            param += ("&codes="+clusterResult[i].cluster[0].code)
    }

    //TODO 把结束时间调整至detailBrush,但不是很恰当
    var s = new Date(detailBrush[0]);
    var e = new Date(detailBrush[1]);
    param += "&startTime="+(new Date(s.setHours(s.getHours()-72)))+"&endTime="+(new Date(e.setHours(e.getHours()+72)));
    param += "&index="+0;


    $.ajax({
        url:"themeriverdata2.do",
        type:"post",
        data: param+"&cluster=" + JSON.stringify(clusterResult),
        success: function (returnData) {
            $("#themeriver")
            if (returnData == null || returnData == "")
                return;
            var dataAll = JSON.parse(returnData);
            var data = dataAll.result;
            var dataLagCor = dataAll.lag;//array [{"code":"1009A","lag":0.7955870797707358,"cor":2},{"code":"1057A","lag":0.7781516905307961,"cor":0},{"code":"1062A","lag":0.7760953665976594,"cor":2}]
            data = assignDefaultValues(data);
            data.forEach(function (d) {
                d.time = new Date(d.time);
                //d.value = +d.pm25;
            });
            var g = d3.select("#themeriver").append("g")
                .attr("transform","translate("+(octagonLocationScreen[dataAll.index].x - 140)+","+(octagonLocationScreen[dataAll.index].y - 120 )+")");
            var svg = g.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var entries = nest.entries(data);
            //输入entries
            var getOrder = function(data){//返回order
                //TODO 计算center的方法修改!!!!
                var center = L.latLng(filteredData[0].latitude, filteredData[0].longitude)
                var dis = [];
                for(var i = 0; i < data.length; i ++){
                    dis[i] = L.latLng(data[i].values[0].lat, data[i].values[0].lon).distanceTo(center);
                }
                //根据距离远近给出order[100,20,200,300]返回[1,0,2,3]
                var result = [];
                for(var i = 0; i < data.length; i ++){
                    var index = dis.indexOf(dis.min());
                    result[index] = i;
                    dis[index] = Number.MAX_VALUE;
                }
                return result;
            };

            order = getOrder(entries);
            var newEntries = [];
            {
                //reorder entries
                for(var i = 0; i < order.length; i ++){
                    var index = order.indexOf(i);
                    newEntries.push(entries[index]);
                }
            }

            var layers = stack(entries);

            x.domain(d3.extent(data, function (d) {
                return d.time;
            }));
            y.domain([0, d3.max(data, function (d) {
                return d.y0 + d.y;
            })]);

            //过滤后的detailBrush在整个时间上占的比例
            var xStartPercent = x(detailBrush[0]) / width;
            var xEndPercent = x(detailBrush[1]) / width;

            //id="grad1" x1="0%" y1="0%" x2="100%" y2="0%"
            var grad = svg.selectAll(".gradient")
                .data(dataLagCor)
                .enter().append("defs")
                .append("linearGradient")
                .attr("id", function(d){return "lag"+d.code;})
                .attr("x1", "0%")
                .attr("y1", "100%")
                .attr("x2", "100%")
                .attr("y2", "100%");
            //<stop offset="50%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
            //<stop offset="51%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
            grad.append("stop")
                .attr("offset", function(d){
                    var nd = new Date(detailBrush[0]);
                    nd.setHours(nd.getHours() - d.lag);
                    return x(nd) / width;})
                .attr("stop-color", function(d, i ){return z(i);})
                .attr("stop-opacity", 1);
            grad.append("stop")
                .attr("offset", function(d){
                    var nd = new Date(detailBrush[0]);
                    nd.setHours(nd.getHours() - d.lag);
                    return x(nd) / width+0.001;})
                .attr("stop-color", function(d){
                    //if(d.lag < 0)
                    //    return colorScaleCorLag(d.cor);
                    //else
                        return colorScaleCor(d.cor);
                })
                .attr("stop-opacity", 1);
            grad.append("stop")
                .attr("offset", function(d){
                    var nd = new Date(detailBrush[1]);
                    nd.setHours(nd.getHours() - d.lag);
                    return x(nd) / width ;})
                .attr("stop-color", function(d){
                    //if(d.lag < 0)
                    //    return colorScaleCorLag(d.cor);
                    //else
                        return colorScaleCor(d.cor);
                })//TODO
                .attr("stop-opacity", 1);
            grad.append("stop")
                .attr("offset", function(d){
                    var nd = new Date(detailBrush[1]);
                    nd.setHours(nd.getHours() - d.lag);
                    return x(nd) / width + 0.001; })
                .attr("stop-color", function(d, i){return z(i);})
                .attr("stop-opacity", 1);


            svg.selectAll(".layer")
                .data(layers)
                .enter().append("path")
                .attr("class", "layer")
                .attr("d", function (d) {
                    return area(d.values);
                })
                .style("fill", function (d, i) {
                    return "url(#"+"lag"+ d.key+")";
                    //console.log("d:"+i+":"+z(i));
                    //return z(i);
                }).on("mouseover", function(d) {
                    if(d.values[0] == null)
                        return;
                    var cor = 0;
                    var lag = 0;
                    var city = "";
                    for(var i = 0; i < clusterResult.length; i ++){
                        for(var j = 0; j < clusterResult[i].cluster.length; j ++){
                            if(clusterResult[i].cluster[j].code == d.key) {
                                cor = clusterResult[i].correlation;
                                lag = clusterResult[i].lag;
                                city = clusterResult[i].cluster[j].city;
                                break;
                            }
                        }
                        if(cor != 0)
                            break;
                    }
                    var div = d3.select("#tooltip");
                    div.transition()
                        .duration(100)
                        .style("opacity", .9);
                    div	.html(city +":"+ parseFloat(cor).toFixed(2)+":"+(parseInt(lag)))
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                    //console.log(d.values[0].city    );
                }).on("mouseout", function(d) {
                    var div = d3.select("#tooltip");
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            //<line x1="0" y1="0" x2="200" y2="200" style="stroke:rgb(255,0,0);stroke-width:2" />
            //框出选择的区域
            svg.append("line")
                .attr("x1", x(detailBrush[0]))
                .attr("y1", "0")
                .attr("x2", x(detailBrush[0]))
                .attr("y2", "150")
                .attr("stroke", "rgb(0, 0, 0)")
                .attr("stroke-width", "1");
            svg.append("line")
                .attr("x1", x(detailBrush[1]))
                .attr("y1", "0")
                .attr("x2", x(detailBrush[1]))
                .attr("y2", "150")
                .attr("stroke", "rgb(0, 0, 0)")
                .attr("stroke-width", "1");

        },
        async:false
    });

}

function createAQHeatMapView(){
    if(aqHeatMapLayer != null)
        map.removeLayer(aqHeatMapLayer);
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();


    aqHeatMapLayer = L.d3SvgOverlay(function(sel, proj) {
        var centerScreen = proj.latLngToLayerPoint(center);
        var x = [], y = [], t = [];
        for(var i = 0; i < unfilteredData.length; i ++) {
            var d = unfilteredData[i];
            var r = (innerRadius + (d.distance - minDis) / (maxDis - minDis) * (outerRadius - innerRadius));
            if(d.distance > maxDis || d.pm25 == null)
                continue;
            x.push(centerScreen.x + r *
                (d.longitude - center.lng) /
                Math.sqrt((d.latitude - center.lat) * (d.latitude - center.lat) + (d.longitude - center.lng) * (d.longitude - center.lng)));
            y.push(centerScreen.y - r *
                (d.latitude - center.lat) /
                Math.sqrt((d.latitude - center.lat) * (d.latitude - center.lat) + (d.longitude - center.lng) * (d.longitude - center.lng)));
            t.push(d.pm25);

        }

        var model = "exponential";
        var sigma2 = 0, alpha = 100;
        var variogram = kriging.train(t, x, y, model, sigma2, alpha);

        for(var i = 0; i < 8; i ++) {
            var bbox = Snap.path.getBBox(octagonPath[i]);
            console.log(bbox.x+":"+bbox.y+":"+bbox.width+":"+bbox.height);
            var g = sel.append("g")
                .attr("id", "correlationHeatMap"+i)
                .attr("transform", "translate(" + bbox.x + "," + bbox.y + ")");

            for (var j = 1; j < bbox.width-1; j+=GRID_SIZE_CORRELATION) {
                for (var k = 1; k < bbox.height-1; k+=GRID_SIZE_CORRELATION) {
                    if (!Snap.path.isPointInside(octagonPath[i], bbox.x + j, bbox.y + k)) {
                        continue;
                    }
                    var value = kriging.predict(bbox.x + j, bbox.y + k, variogram);
                    g.append("rect")
                        .attr("width", GRID_SIZE_CORRELATION+1)
                        .attr("height", GRID_SIZE_CORRELATION+1)
                        .attr("fill", colorScale(value))
                        .attr("fill-opacity", 0.9)//Math.abs(value))
                        .attr("transform", "translate(" + j + "," + k + ")");
                }
            }
        }

    });
    aqHeatMapLayer.addTo(map);
}

function createCorHeatMapView(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();


    corHeatMapLayer = L.d3SvgOverlay(function(sel, proj) {
        var x = [], y = [], t = [];
        $("circle").each(function() {
            var id = $(this).attr("id");
            for(var i = 0; i < clusterResult.length; i ++){
                if(clusterResult[i].id != id)
                    continue;
                if(Math.abs(clusterResult[i].correlation < COR_THREADHOOD))
                    continue;
                x.push($(this).attr("cx"));
                y.push($(this).attr("cy"));
                if(clusterResult[i].lag > 0)
                    t.push(clusterResult[i].correlation);
                else
                    t.push(-clusterResult[i].correlation);
            }
        });//TODO 一定特别注意坐标变换

        var model = "exponential";
        var sigma2 = 0, alpha = 100;
        var variogram = kriging.train(t, x, y, model, sigma2, alpha);

        for(var i = 0; i < 8; i ++) {
            var bbox = Snap.path.getBBox(octagonPath[i]);
            console.log(bbox.x+":"+bbox.y+":"+bbox.width+":"+bbox.height);
            var g = sel.append("g")
                .attr("id", "correlationHeatMap"+i)
                .attr("transform", "translate(" + bbox.x + "," + bbox.y + ")");

            for (var j = 1; j < bbox.width-1; j+=GRID_SIZE_CORRELATION) {
                for (var k = 1; k < bbox.height-1; k+=GRID_SIZE_CORRELATION) {

                    if (!Snap.path.isPointInside(octagonPath[i], bbox.x + j, bbox.y + k)) {
                        continue;
                    }
                    var value = kriging.predict(bbox.x + j, bbox.y + k, variogram);
                    if(value > 1)
                        value = 1;
                    if(value < -1)
                        value = -1;
                    g.append("rect")
                        .attr("width", GRID_SIZE_CORRELATION+1)
                        .attr("height", GRID_SIZE_CORRELATION+1)
                        .attr("fill", colorScaleCor4Heatmap(value))
                        .attr("fill-opacity", 0.9)//Math.abs(value))
                        .attr("transform", "translate(" + j + "," + k + ")");
                    //console.log(value+":"+colorScaleCor(value));
                }
            }
        }

    });
    corHeatMapLayer.addTo(map);

}

/**
 * 使用两个维度映射实现heatmap
 */
function createCorHeatMapView2(){
    var sel = d3.select("#correlationHM");
    if(sel[0][0] == null)
        sel = d3.select("#circleView").append("g").attr("id", "correlationHM");

    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    //var maxLead = 0;
    //var minLead = 0;
    var sumLead = 0;
    var sumLag = 0;
    var countLead = 0;
    var countLag = 0;
    var leadCluster = [];
    var lagCluster = [];
    var maxLeadCor = 0;
    var maxLagCor = 0;
    for(var i = 0; i < clusterResult.length; i ++){
        if(clusterResult[i].pvalue > 0.05 )
            continue;
        if(clusterResult[i].lag > 0){
            sumLead += clusterResult[i].lag;
            countLead ++;
            leadCluster.push(clusterResult[i].lag);
            if(clusterResult[i].correlation > maxLeadCor)
                maxLeadCor = clusterResult[i].correlation;
        }else{
            sumLag += clusterResult[i].lag;
            countLag ++;
            lagCluster.push(clusterResult[i].lag);
            if(clusterResult[i].correlation > maxLagCor)
                maxLagCor = clusterResult[i].correlation;
        }
    }

    var avgLead = sumLead/countLead;
    var avgLag = sumLag/ countLag;
    var sumTemp = 0;
    for(var i = 0; i < countLead; i ++){
        sumTemp += ((leadCluster[i] - avgLead) * (leadCluster[i] - avgLead));
    }
    var standardDeviationLead = Math.sqrt(sumTemp / countLead);

    sumTemp = 0;
    for(var i = 0; i < countLag; i ++){
        sumTemp += ((lagCluster[i] - avgLag) * (lagCluster[i] - avgLag));
    }
    var standardDeviationLag = Math.sqrt(sumTemp / countLag);

    //corHeatMapLayer = L.d3SvgOverlay(function(sel, proj) {

    var x = [], y = [], t = [];
    var tL = [];//tL是lead/lagValue
    $("circle").each(function() {
        var id = $(this).attr("id");
        for(var i = 0; i < clusterResult.length; i ++){
            if(clusterResult[i].id != id)
                continue;
            var lagValue = clusterResult[i].lag;
            if(lagValue > 0 &&
                (lagValue > (avgLead + 2 * standardDeviationLead) || lagValue < (avgLead - 2 * standardDeviationLead))){
                console.log("lagValue:"+clusterResult[i].lag);
                continue;
            }else if(lagValue < 0 &&
                (lagValue > (avgLag + 2 * standardDeviationLag) || lagValue < (avgLag - 2 * standardDeviationLag))){
                console.log("lagValue:"+clusterResult[i].lag);
                continue;
            }

            if(Math.abs(clusterResult[i].correlation < COR_THREADHOOD))
                continue;
            if(Math.abs(clusterResult[i].correlation < COR_THREADHOOD))
                continue;

            x.push($(this).attr("cx"));
            y.push($(this).attr("cy"));
            tL.push(clusterResult[i].lag);

            if(clusterResult[i].lag > 0)
                t.push(clusterResult[i].correlation);
            else
                t.push(-clusterResult[i].correlation);
        }
    });

    var model = "exponential";
    //var model = "gaussian";
    var sigma2 = 0, alpha = 100;
    var variogram = kriging.train(t, x, y, model, sigma2, alpha);
    var variogramL = kriging.train(tL, x, y, model, sigma2, alpha);

    var temp = ((avgLead + 2 * standardDeviationLead) > (Math.abs(avgLag - 2 * standardDeviationLag))) ?
        (avgLead + 2 * standardDeviationLead) :
        (Math.abs(avgLag - 2 * standardDeviationLag));

    var maxCor = maxLagCor > maxLeadCor ? maxLagCor : maxLeadCor;

    //var leadH = d3.scale.linear().domain([1, 0]).range([0, 60]);
    //var lagH = d3.scale.linear().domain([-1,0]).range([120, 60]);
    var leadH = d3.scale.linear().domain([1, maxCor,  COR_THREADHOOD, 0]).range([0, 0, 60, 60]);
    var lagH = d3.scale.linear().domain([-1, -maxCor, -COR_THREADHOOD, 0]).range([120, 120, 60, 60]);
    //var leadS = d3.scale.linear().domain([0, (avgLead + 2 * standardDeviationLead), 1000]).range([0.5, 0.9, 0.9]);
    //var lagS = d3.scale.linear().domain([0, (avgLag - 2 * standardDeviationLag), -1000]).range([0.5, 0.9, 0.9]);
    //var leadS = d3.scale.linear().domain([0, temp, 1000]).range([0.5, 0.9, 0.9]);
    //var lagS = d3.scale.linear().domain([0, -temp, -1000]).range([0.5, 0.9, 0.9]);
    var temp1 = (avgLead - 2 * standardDeviationLead) > 0 ? (avgLead - 2 * standardDeviationLead) : 0;
    var temp2 = (avgLag + 2 * standardDeviationLag) < 0 ? (avgLag + 2 * standardDeviationLag) : 0;
    var leadS2 = d3.scale.linear().domain([0, temp1,  (avgLead + 2 * standardDeviationLead), 1000]).range([0.5, 0.5, 0.9, 0.9]);
    var lagS2 = d3.scale.linear().domain([0, temp2, (avgLag - 2 * standardDeviationLag), -1000]).range([0.5, 0.5, 0.9, 0.9]);
    var leadS = d3.scale.linear().domain([0, temp1,  (avgLead + 2 * standardDeviationLead), 1000]).range([1, 1, 0, 0]);
    var lagS = d3.scale.linear().domain([0, temp2, (avgLag - 2 * standardDeviationLag), -1000]).range([1, 1, 0, 0]);

    console.log("avgLead:"+avgLead+":"+standardDeviationLead);
    console.log("avgLag:"+avgLag+":"+standardDeviationLag);

    for(var i = 0; i < 8; i ++) {
        var bbox = Snap.path.getBBox(octagonPath[i]);
        console.log(bbox.x+":"+bbox.y+":"+bbox.width+":"+bbox.height);
        var g = sel.append("g")
            .attr("id", "correlationHeatMap"+i)
            .attr("transform", "translate(" + bbox.x + "," + bbox.y + ")");

        for (var j = 1; j < bbox.width-1; j+=GRID_SIZE_CORRELATION) {
            for (var k = 1; k < bbox.height-1; k+=GRID_SIZE_CORRELATION) {

                if (!Snap.path.isPointInside(octagonPath[i], bbox.x + j, bbox.y + k)) {
                    continue;
                }
                var value = kriging.predict(bbox.x + j, bbox.y + k, variogram);
                var valueL = kriging.predict(bbox.x + j, bbox.y + k, variogramL);
                if(value > 1){
                    value = 1;
                }else if(value < -1){
                    value = -1;
                }
                if(value < 0 && valueL > 0){
                    valueL = 0;
                }else if(value > 0 && valueL < 0){
                    valueL = 0;
                }
                g.append("rect")
                    .attr("width", GRID_SIZE_CORRELATION+1)
                    .attr("height", GRID_SIZE_CORRELATION+1)
                    .attr("fill", function(){
                        if(value > 0){
                            //return d3.hsl(leadH(value), leadS(valueL), leadS2(valueL) ).rgb();
                            return d3.hsl(leadH(value), 1.0,  leadS2(valueL)).rgb();
                        }else{
                            //return d3.hsl(lagH(value), lagS(valueL), lagS2(valueL)).rgb();
                            return d3.hsl(lagH(value), 1.0, lagS2(valueL)).rgb();
                        }
                    })
                    .attr("fill-opacity", 1)//Math.abs(value))
                    .attr("transform", "translate(" + j + "," + k + ")");
                //console.log(value+":"+colorScaleCor(value));
            }
        }
    }


}

/**
 * 另一种映射方法,根据lag的数值进行映射,
 * 只取correlation大于某个数值的
 */
function corHeatMapLayerLeadValue(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    var maxLead = 0;
    var minLead = 0;
    var sumMax = 0;
    var sumMin = 0;
    for(var i = 0; i < clusterResult.length; i ++){
        if(clusterResult[i].lag > maxLead)
            maxLead = clusterResult[i].lag;
        if(clusterResult[i].lag < minLead)
            minLead = clusterResult[i].lag;
        if(clusterResult[i].lag > 0)
            sumMax += clusterResult[i].lag;
        if(clusterResult[i].lag < 0)
            sumMin += clusterResult[i].lag;
    }
    var avgMax = sumMax/clusterResult.length;
    var avgMin = sumMin/ clusterResult.length;

    var c3 = ["#FF0000", "#FF0000", "#FFFF00", "#00FF00", "#00FF00"];
    var colorScaleLagValue  = d3.scale.linear().domain([maxLead, avgMax, 0, avgMin, minLead]).range(c3);

    corHeatMapLayer = L.d3SvgOverlay(function(sel, proj) {

        var x = [], y = [], t = [];
        $("circle").each(function() {
            var id = $(this).attr("id");
            for(var i = 0; i < clusterResult.length; i ++){
                if(clusterResult[i].id != id)
                    continue;
                if(Math.abs(clusterResult[i].correlation < COR_THREADHOOD))
                    continue;
                x.push($(this).attr("cx"));
                y.push($(this).attr("cy"));
                    t.push(clusterResult[i].lag);
            }
        });//TODO 一定特别注意坐标变换

        var model = "exponential";
        var sigma2 = 0, alpha = 100;
        var variogram = kriging.train(t, x, y, model, sigma2, alpha);

        for(var i = 0; i < 8; i ++) {
            var bbox = Snap.path.getBBox(octagonPath[i]);
            console.log(bbox.x+":"+bbox.y+":"+bbox.width+":"+bbox.height);
            var g = sel.append("g")
                .attr("id", "correlationHeatMap"+i)
                .attr("transform", "translate(" + bbox.x + "," + bbox.y + ")");

            for (var j = 1; j < bbox.width-1; j+=GRID_SIZE_CORRELATION) {
                for (var k = 1; k < bbox.height-1; k+=GRID_SIZE_CORRELATION) {

                    if (!Snap.path.isPointInside(octagonPath[i], bbox.x + j, bbox.y + k)) {
                        continue;
                    }
                    var value = kriging.predict(bbox.x + j, bbox.y + k, variogram);
                    g.append("rect")
                        .attr("width", GRID_SIZE_CORRELATION+1)
                        .attr("height", GRID_SIZE_CORRELATION+1)
                        .attr("fill", colorScaleLagValue(value))
                        .attr("fill-opacity", 0.9)//Math.abs(value))
                        .attr("transform", "translate(" + j + "," + k + ")");
                    //console.log(value+":"+colorScaleCor(value));
                }
            }
        }

    });
    corHeatMapLayer.addTo(map);
}

//超前分析
function createLeadCorHeatMapView(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    corHeatMapLayer = L.d3SvgOverlay(function(sel, proj) {
        var x = [], y = [], t = [];
        $("circle").each(function() {
            var id = $(this).attr("id");
            for(var i = 0; i < clusterResult.length; i ++){
                if(clusterResult[i].id != id)
                    continue;
                if(Math.abs(clusterResult[i].correlation < COR_THREADHOOD))
                    continue;
                x.push($(this).attr("cx"));
                y.push($(this).attr("cy"));
                if(clusterResult[i].lag > 0)
                    t.push(clusterResult[i].correlation);
                else
                    t.push(0);
            }
        });//TODO 一定特别注意坐标变换

        var model = "exponential";
        var sigma2 = 0, alpha = 100;
        var variogram = kriging.train(t, x, y, model, sigma2, alpha);

        for(var i = 0; i < 8; i ++) {
            var bbox = Snap.path.getBBox(octagonPath[i]);
            console.log(bbox.x+":"+bbox.y+":"+bbox.width+":"+bbox.height);
            var g = sel.append("g")
                .attr("id", "correlationHeatMap"+i)
                .attr("transform", "translate(" + bbox.x + "," + bbox.y + ")");

            for (var j = 1; j < bbox.width-1; j+=GRID_SIZE_CORRELATION) {
                for (var k = 1; k < bbox.height-1; k+=GRID_SIZE_CORRELATION) {
                    if (!Snap.path.isPointInside(octagonPath[i], bbox.x + j, bbox.y + k)) {
                        continue;
                    }
                    var value = kriging.predict(bbox.x + j, bbox.y + k, variogram);
                    if(value > 1)
                        value = 1;
                    if(value < -1)
                        value = -1;
                    g.append("rect")
                        .attr("width", GRID_SIZE_CORRELATION+1)
                        .attr("height", GRID_SIZE_CORRELATION+1)
                        .attr("fill", colorScaleCor(value))
                        .attr("fill-opacity", 0.9)//Math.abs(value))
                        .attr("transform", "translate(" + j + "," + k + ")");
                    //console.log(value+":"+colorScaleCor(value));
                }
            }
        }

    });
    corHeatMapLayer.addTo(map);

}

//滞后分析
function createLagCorHeatMapView(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  SIZE_RING;
    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();


    corHeatMapLayer = L.d3SvgOverlay(function(sel, proj) {
        var x = [], y = [], t = [];
        $("circle").each(function() {
            var id = $(this).attr("id");
            for(var i = 0; i < clusterResult.length; i ++){
                if(clusterResult[i].id != id)
                    continue;
                if(Math.abs(clusterResult[i].correlation < COR_THREADHOOD))
                    continue;
                x.push($(this).attr("cx"));
                y.push($(this).attr("cy"));
                if(clusterResult[i].lag > 0)
                    t.push(0);
                else
                    t.push(clusterResult[i].correlation);
            }
        });//TODO 一定特别注意坐标变换

        var model = "exponential";
        var sigma2 = 0, alpha = 100;
        var variogram = kriging.train(t, x, y, model, sigma2, alpha);

        for(var i = 0; i < 8; i ++) {
            var bbox = Snap.path.getBBox(octagonPath[i]);
            console.log(bbox.x+":"+bbox.y+":"+bbox.width+":"+bbox.height);
            var g = sel.append("g")
                .attr("id", "correlationHeatMap"+i)
                .attr("transform", "translate(" + bbox.x + "," + bbox.y + ")");

            for (var j = 1; j < bbox.width-1; j+=GRID_SIZE_CORRELATION) {
                for (var k = 1; k < bbox.height-1; k+=GRID_SIZE_CORRELATION) {
                    if (!Snap.path.isPointInside(octagonPath[i], bbox.x + j, bbox.y + k)) {
                        continue;
                    }
                    var value = kriging.predict(bbox.x + j, bbox.y + k, variogram);
                    if(value > 1)
                        value = 1;
                    if(value < -1)
                        value = -1;
                    g.append("rect")
                        .attr("width", GRID_SIZE_CORRELATION+1)
                        .attr("height", GRID_SIZE_CORRELATION+1)
                        .attr("fill", colorScaleCorLag(value))
                        .attr("fill-opacity", 0.9)//Math.abs(value))
                        .attr("transform", "translate(" + j + "," + k + ")");
                    //console.log(value+":"+colorScaleCor(value));
                }
            }
        }

    });
    corHeatMapLayer.addTo(map);

}


/////////Followings are controller to control the visibility of layers//////
//下面是控制各种层显示与否的方法


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
        if(provinceValueOverlay != null)
            map.removeLayer(provinceValueOverlay);
    }
}

function cityValueControl(){
    if($("#cityValue").is( ':checked' )){
        if(cityValueOverlay != null)
            map.removeLayer(cityValueOverlay);
        createCityValue();
    }else{
        if(cityValueOverlay != null)
            map.removeLayer(cityValueOverlay);
    }
}



function controlThemeRiver(){
    for(var i = 0; i < 8; i ++){
        $("#themeriver"+i).empty();
    }
    $(".themeriver").remove();
    if(themeLayer != null){
        for(var i = 0; i < 8; i ++){
            if(themeLayer[i] != null)
                map.removeLayer(themeLayer[i]);
        }
    }
    if($("#controlThemeRiver").is(":checked")){
        clusterAndThemeRiver();
    }
}

function controlGroupThemeRiver(){
    $("#themeriver").empty();
    if($("#controlGroupThemeRiver").is(":checked")){
        groupThemeRiver();
    }
}

function controlCluster(){
    if($("#controlCluster").is(":checked")){
        if(freedrawEvent.latLngs == null || freedrawEvent.latLngs.length == 0) {
            window.alert("you should select a region on the map first.");
            return;
        }else if(overAllBrush == null){
            window.alert("you should select a time region on the trend view first.");
            return;
        }
        cluster();
    }else{
        drawScatterGroup();
    }
}

function controlClusterWind(){
    if($("#controlClusterWind").is(":checked")){
        $(".clusterwind").each(function(){$(this).attr("visibility", "visible");})
    }else{
        $(".clusterwind").each(function(){$(this).attr("visibility", "hidden")});
    }

}
function controlHeatMapCor(){
    if($("#controlHeatMapCor").is(":checked")){
        createCorHeatMapView2();
    }else{
        $("#correlationHM").remove();
    }
}

function controlHeatMapCorLeadValue(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    if($("#controlHeatMapCorLeadValue").is(":checked")){
        corHeatMapLayerLeadValue();
    }
}

function controlAQHeatMap(){
    if(aqHeatMapLayer != null)
        map.removeLayer(aqHeatMapLayer);
    if($("#controlAQHeatMap").is(":checked")){
        createAQHeatMapView();
    }

}
function controlLeadHeatMapCor(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    if($("#controlLeadHeatMapCor").is(":checked")){
        createLeadCorHeatMapView();
    }
}
function controlLagHeatMapCor(){
    if(corHeatMapLayer != null)
        map.removeLayer(corHeatMapLayer);
    if($("#controlLagHeatMapCor").is(":checked")){
        createLagCorHeatMapView();
    }
}
function controlGrids(){
    if(gridsView != null)
        map.removeLayer(gridsView);
    if($("#controlGrids").is(":checked")){
        createGridsView();
    }
}

function controlWinds(){
    if(windsView != null){
        map.removeLayer(windsView);

    }
    if($("#controlWinds").is(":checked")){
        createWindsView();
    }
}

function controlLLCGroup(){
    if($("#controlLLCGroup").is(":checked")){
        $("#llcBar").empty();
        displayLLCView();
    }else{
        $("#llcBar").empty();
    }
}

function controlDetailWind(){
    if($("#controlDetailWind").is(":checked")){
        displayWind();
    }else{
        if(detailWindLayer != null) {
            windy.stop();
            map.removeLayer(detailWindLayer);
        }
    }
}

function cityBoundaryControl(){
    if($("#cityBoundary").is( ':checked' )){
        createCityMap();
    }else{
        map.removeLayer(cityBoundaryOverlay);
    }
}

function controlController(){
    if($("#controlController").is( ':checked' )){
        displayCustomizedFilter();
    }else{
        map.removeLayer(filterControl);
    }
}

function controlContextRing(){
    if($("#controlContextRing").is(":checked")){
        if(freedrawEvent.latLngs == null || freedrawEvent.latLngs.length == 0) {
            window.alert("you should select a region on the map first.");
            return;
        }else if(overAllBrush == null){
            window.alert("you should select a time region on the trend view first.");
            return;
        }

        createCircleView(contextRingOption);
    }
}

function hideMeteorologicalStations(){
    meteorologicalStationLayer.clearLayers();
}

function hidePoints(){
    locationLayer.clearLayers();
}
