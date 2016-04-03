/**
 * Created by yidu on 11/10/15.
 */

//地图对象
var map;

//各种叠加图层
var locationLayer, freedrawLayer, meteorologicalStationLayer;
var provinceBoundaryOverlay, cityBoundaryOverlay, contextRing, clusterLayer, themeLayer, gridsView, windsView;
var provinceValueOverlay, cityValueOverlay;

var overAllBrush;
var filteredData = [];//经过过滤后的数据，包括station,lon,lat,code
var unfilteredData = [];//经过过滤后剩下的数据,结构同filteredData

var paintControl = {
    calendar        :   false,
    calendarType    :   1,//0dayofmonth
    trend           :   false,
    stations        :   false,
    mstations       :   false
};

//option of points
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
var maxDis = 1000000, minDis;

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

//当前选择的月份
var currentSelectedDate = new Date("2015-10-01");

//contextRing param
var sizeScreen;
var outerRadius;
var innerRadius;

var clusterResult;

//八边形从北开始顺时针,各个格子在屏幕中的位置
var octagonLocationScreen = [];

function initUIs(){
    $('#map').css("width", window.screen.availWidth).css("height", window.screen.availHeight);
    L.mapbox.accessToken = 'pk.eyJ1Ijoic3Vuc25vd2FkIiwiYSI6ImNpZ3R4ejU3ODA5dm91OG0xN2d2ZmUyYmIifQ.jgzNI617vX6h48r0_mRzig';
    map = L.mapbox.map('map', 'mapbox.streets')
        .setView([23, 120], 4);
    map.options.minZoom = 4;
    map.options.maxZoom = 13;

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

    map.on('zoomend', function() {
        controlContextRing();
        clusterAndThemeRiver();
    });
    map.on('moveend', function(){
        //maxDis = null;
        minDis = null;
        //controlContextRing();//TODO
        if($("#controlContextRing").is(":checked")){
            $( "#slider" ).slider( "option", "min", minDis );
            $( "#slider" ).slider( "option", "max", maxDis );
            $("#maxDistance").text(parseInt(maxDis/1000) + "km");
            $("#minDistance").text(parseInt(minDis/1000) + "km");
        }
        console.log("move end");
        updateBounds4Grids();
        //controlContextRing();
        //clusterAndThemeRiver();
    });

    $("#slider").slider();
    $( "#slider" ).on( "slidechange",
        function( event, ui ) {
            //maxDis = ui.value;
            $("#maxDistance").text(parseInt(ui.value));
            //controlContextRing();//TODO
        }
    );
    createCityValue();
}

/**
 * 重置grids
 */
function updateBounds4Grids(){
    //放缩后,grid重置
    westUsed = (map.getBounds().getWest() > WEST) ? map.getBounds().getWest() : WEST;
    eastUsed = (map.getBounds().getEast() < EAST) ? map.getBounds().getEast() : EAST;
    southUsed = (map.getBounds().getSouth() > SOUTH) ? map.getBounds().getSouth() : SOUTH;
    northUsed = (map.getBounds().getNorth() < NORTH) ? map.getBounds().getNorth() : NORTH;
    controlGrids();
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
        upd.attr('stroke-width', 1 / proj.scale);
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
            .attr('fill-opacity', '0.7');
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
            .attr('fill-opacity', '0.5');
        upd.attr('stroke-width', 0.5 / proj.scale);
    });

    var time = "";
    if(overAllBrush != null){
        time += "startTime="+overAllBrush[0] +"&endTime="+overAllBrush[1];
    }
    $.ajax({
        url: "valueByCities.do",
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
                }else{
                    //add unfiltered data
                    unfilteredData.push(data[i]);
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
    //var totalW = $("#trend").width(), totalH = $("#trend").height();
    //var startTime
    var totalW = 2500, totalH = $("#trend").height();
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
        type:"post",
        data: cities,
        success: function (returnData) {
            var data = JSON.parse(returnData);

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

            //TODO
            var imageDate = [new Date("2013-12-01"), new Date("2014-01-01"), new Date("2014-02-01")
                ,new Date("2014-03-01"), new Date("2014-04-01"), new Date("2014-05-01")
                ,new Date("2014-06-01"), new Date("2014-07-01"), new Date("2014-08-01")
                ,new Date("2014-09-01"), new Date("2014-10-01"), new Date("2014-11-01")
                ,new Date("2014-12-01"), new Date("2015-01-01"), new Date("2015-02-01")
                ,new Date("2015-03-01"), new Date("2015-04-01"), new Date("2015-05-01")
                ,new Date("2015-06-01"), new Date("2015-07-01"), new Date("2015-08-01")
                ,new Date("2015-09-01"), new Date("2015-0=10-01")];
            var imagePanel = context.append("g").attr("id", "image");
            imagePanel.selectAll("image")
                .data(imageDate)
                .enter()
                .append("image")
                .attr("x",function(d){return x(d);})
                .attr("y",0)
                .attr("width", 100)
                .attr("height", 100)
                .attr("xlink:href", "../imgs/201401.png")
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


}

/**
 * TODO all repaint should use this function
 */
function repaintAll(){
    //TODO
    createCalendarView();
    provinceValueControl();
    cityValueControl();
}

/**
 * 在屏幕上创建的问题就是div覆盖了地图图层,使得地图不能交互
 */
function createCircleView2() {
    //var direction = [];
    //var distance = [];
    if(contextRing != null)
        map.removeLayer(contextRing);

    var bounds = L.geoJson(L.FreeDraw.Utilities.getGEOJSONPolygons(freedrawEvent.latLngs));
    var center = bounds.getBounds().getCenter();

    sizeScreen = map.getPixelBounds().getSize();
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  200;

    if(minDis == null) {
        minDis = Number.MAX_VALUE;
        for (var i = 0; i < unfilteredData.length; i++) {
            var dist = L.latLng(unfilteredData[i].latitude, unfilteredData[i].longitude).distanceTo(center);
            unfilteredData[i].distance = dist;
            if (dist < minDis)
                minDis = dist;
            var angle = Math.asin((unfilteredData[i].longitude - center.longitude) / dist);
            unfilteredData[i].direction = (angle + Math.PI / 8) % Math.PI / 4;
        }
    }
    if(maxDis == null) {
        maxDis = 0;
        for (var i = 0; i < unfilteredData.length; i++) {
            var dist = L.latLng(unfilteredData[i].latitude, unfilteredData[i].longitude).distanceTo(center);
            unfilteredData[i].distance = dist;
            if (dist > maxDis)
                maxDis = dist;
            var angle = Math.asin((unfilteredData[i].longitude - center.longitude) / dist);
            unfilteredData[i].direction = (angle + Math.PI / 8) % Math.PI / 4;
        }
    }

    contextRing = L.d3SvgOverlay(function(sel, proj) {

        var centerScreen = proj.latLngToLayerPoint(center);
        //计算context ring的path
        var pathContextRing = function(d){
            //var startAngle = Math.PI * 2 * 15 / 16;
            var intervalAngle = Math.PI * 2 / 8;
            var path = "M ";
            var p1X = centerScreen.x + innerRadius * Math.sin(d.angle);
            var p1Y = centerScreen.y - innerRadius * Math.cos(d.angle);
            var p2X = centerScreen.x + innerRadius * Math.sin(d.angle + intervalAngle);
            var p2Y = centerScreen.y - innerRadius * Math.cos(d.angle + intervalAngle);
            var p3X = centerScreen.x + outerRadius * Math.sin(d.angle + intervalAngle);
            var p3Y = centerScreen.y - outerRadius * Math.cos(d.angle + intervalAngle);
            var p4X = centerScreen.x + outerRadius * Math.sin(d.angle);
            var p4Y = centerScreen.y - outerRadius * Math.cos(d.angle);
            path += p1X + " ";
            path += p1Y + " L ";
            path += p2X + " ";
            path += p2Y + " L ";
            path += p3X + " ";
            path += p3Y + " L ";
            path += p4X + " ";
            path += p4Y + " ";
            path += " Z ";
            var centerXGrid = (p1X + p2X + p3X + p4X) / 4;
            var centerYGrid = (p1Y + p2Y + p3Y + p4Y) / 4;
            octagonLocationScreen[d.dir] = {};
            octagonLocationScreen[d.dir].x = centerXGrid;
            octagonLocationScreen[d.dir].y = centerYGrid;

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
            temp.angle = startAngle + intervalAngle;
            parts.push(temp);
            startAngle += intervalAngle;
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
        //var themeRivers = sel.append("g")
        //    .attr("id", "themeRivers");
        //themeRivers.selectAll("g").data(parts)
        //    .enter()
        //    .append("g")
        //    .attr("id", themeRiverId)
        //    .append("")

        var stationX = function(d){
            var r = (innerRadius + (d.distance - minDis)/(maxDis-minDis) * (outerRadius - innerRadius));
            //
            return centerScreen.x + r *
                (d.longitude - center.lng) /
                Math.sqrt((d.latitude - center.lat)*(d.latitude - center.lat) + (d.longitude - center.lng)*(d.longitude - center.lng));
        }
        var stationY = function(d){
            var r = (innerRadius + (d.distance - minDis)/(maxDis-minDis) * (outerRadius - innerRadius));
            return centerScreen.y - r *
                (d.latitude - center.lat) /
                Math.sqrt((d.latitude - center.lat)*(d.latitude - center.lat) + (d.longitude - center.lng)*(d.longitude - center.lng));
        }
        sel.append("g").selectAll(".contextScatter").data(unfilteredData)
            .enter()
            .append("circle")
            .filter(function(d){return d.distance > minDis && d.distance < maxDis;})
            .attr('r',function(d){return 1;})
            .attr('cx', stationX)
            .attr('cy',stationY)
            .attr('stroke','black')
            .attr('stroke-width',1);


        //绘制中心的趋势图
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
        var timeRange = "&startTime=2015-01-01&endTime=2015-01-03";
        $.ajax({
            url:"hourTrends2.do",
            type:"post",
            data: cities+"&"+timeRange,
            success: function (returnData) {
                var data = JSON.parse(returnData);

                var trend = sel.append("g").attr("id", "trendsCenter")
                    .attr("transform", "translate("+(centerScreen.x-150)+"," + centerScreen.y + ")");

                var x = d3.time.scale().range([0, 300]),
                    y = d3.scale.linear().range([ -50, 0]);

                var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(4).tickFormat(d3.time.format("%b%d %H")),
                    yAxis = d3.svg.axis().scale(y).orient("left");

                var line = d3.svg.line()
                    .interpolate("monotone")
                    .x(function (d) {
                        return x(new Date(d.time.$date));
                    })
                    .y(function (d) {
                        return y(d.pm25);
                    });
                var color = d3.scale.category10();
                color.domain(d3.keys(data[0]).filter(function (key) {
                    return key === "pm25";
                }));

                x.domain(d3.extent(data.map(function (d) {
                    return new Date(d.time.$date);
                })));

                //TODO 固定y轴最大数值
                y.domain([0, 150]);

                trend.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate("+0+"," + 0 + ")")
                    .call(xAxis);

                trend.append("path")
                    .datum(data)
                    .attr("class", "line")
                    .attr("d", line);

            }});

        ////绘制theme river
        //$.ajax({
        //    url:"rangetrend.do",
        //    type:"post",
        //    data: "",
        //    success: function (returnData) {
        //
        //    }});

    });

    contextRing.addTo(map);
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
        if(provinceValueOverlay != null)
            map.removeLayer(cityValueOverlay);
    }
}

function controlContextRing(){
    if(contextRing != null)
        map.removeLayer(contextRing);
    if($("#controlContextRing").is(":checked")){
        createCircleView2();
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

/**将unfiltereddata进行聚类
 * 首先根据city区域进行聚类
 * 然后根据时间相似性进行聚类
 */
function cluster(){
    if(clusterLayer != null)
        map.removeLayer(clusterLayer);
    sizeScreen = map.getPixelBounds().getSize();
    outerRadius = sizeScreen.y / 2-50;
    innerRadius = outerRadius -  200;
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
    $.ajax({
        url:"cluster.do",
        type:"post",
        data: param,
        success: function (returnData) {
            var data = JSON.parse(returnData);
            clusterResult = data;

            for(var i = 0; i < data.length; i ++){
                data[i].distance = L.latLng(data[i].centerY[0], data[i].centerX[0]).distanceTo(center);
            }

            clusterLayer = L.d3SvgOverlay(function(sel, proj) {
                var centerScreen = proj.latLngToLayerPoint(center);

                var stationX = function (d) {
                    var r = (innerRadius + (d.distance - minDis) / (maxDis - minDis) * (outerRadius - innerRadius));
                    return centerScreen.x + r *
                        (d.centerX[0] - center.lng) /
                        Math.sqrt((d.centerY[0] - center.lat) * (d.centerY[0] - center.lat) + (d.centerX[0] - center.lng) * (d.centerX[0] - center.lng));
                }
                var stationY = function (d) {
                    var r = (innerRadius + (d.distance - minDis) / (maxDis - minDis) * (outerRadius - innerRadius));
                    return centerScreen.y - r *
                        (d.centerY[0] - center.lat) /
                        Math.sqrt((d.centerY[0] - center.lat) * (d.centerY[0] - center.lat) + (d.centerX[0] - center.lng) * (d.centerX[0] - center.lng));
                }
                sel.append("g").selectAll(".cluster").data(data)
                    .enter()
                    .append("circle")
                    .attr('r', function (d) {
                        return d.cluster[0].length*5;
                    })
                    .attr('cx', stationX)
                    .attr('cy', stationY)
                    .attr('fill', 'yellow')
                    .attr('opacity', '1')
                    .attr('stroke', 'black')
                    .attr('stroke-width', 1);
            });
            clusterLayer.addTo(map);
        }
    });
}

/**
 * 根据方向重新将clusterResult组织一下
 */
function reorganizeCluster(){
    if(clusterResult == null)
        return;
    var organizedCluster = [];
    for(var i = 0; i < 8; i ++)
        organizedCluster[i] = [];
    for(var i = 0; i < clusterResult.length; i ++){

    }
}
/**
 * 聚类,然后绘制themeriver
 */
//TODO
function clusterAndThemeRiver(){
    for(var i = 0; i < 8; i ++){
        $("#themeriver"+i).empty();
    }
    if(themeLayer != null)
        map.removeLayer(themeLayer);
    colorrange = ["#045A8D", "#2B8CBE", "#74A9CF", "#A6BDDB", "#D0D1E6", "#F1EEF6"];
    var strokecolor = colorrange[0];
    var margin = {top: 20, right: 40, bottom: 30, left: 30};

    var format = d3.time.format("%m/%d/%y");

    var width = 200;//TODO
    var height = 150;//TODO

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


    var stack = d3.layout.stack()
        .offset("silhouette")
        .values(function (d) {
            return d.values;
        })
        .x(function (d) {
            return d.date;
        })
        .y(function (d) {
            return d.value;
        });

    var nest = d3.nest()
        .key(function (d) {
            return d.key;
        });

    var area = d3.svg.area()
        .interpolate("cardinal")
        .x(function (d) {
            return x(d.date);
        })
        .y0(function (d) {
            return y(d.y0);
        })
        .y1(function (d) {
            return y(d.y0 + d.y);
        });
    themeLayer = L.d3SvgOverlay(function(sel, proj) {
        //
        var graph = d3.csv("data.csv", function (data) {
            data.forEach(function (d) {
                d.date = format.parse(d.date);
                d.value = +d.value;
            });

            for (var index = 0; index < 8; index++) {

                //使用svgoverlayer,作为一个layer添加,就无法交互
                var g = d3.select("#themeriver" + index)
                    .style("left", (octagonLocationScreen[index].x - 140) + "px")
                    .style("top", (octagonLocationScreen[index].y - 180 ) + "px");

                var svg = g.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                //var svg = sel.append("g")
                //    .attr("transform", "translate(" + (octagonLocationScreen[index].x - 140 + margin.left) + "," + (octagonLocationScreen[index].y - 120 + margin.top) + ")");
                var layers = stack(nest.entries(data));

                x.domain(d3.extent(data, function (d) {
                    return d.date;
                }));
                y.domain([0, d3.max(data, function (d) {
                    return d.y0 + d.y;
                })]);

                svg.selectAll(".layer" )
                    .data(layers)
                    .enter().append("path")
                    .attr("class", "layer" )
                    .attr("d", function (d) {
                        return area(d.values);
                    })
                    .style("fill", function (d, i) {
                        return z(i);
                    });


                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                //y axis
                //svg.append("g")
                //    .attr("class", "y axis")
                //    .call(yAxis.orient("left"));

                //svg.selectAll(".layer" )
                //    .attr("opacity", 1)
                //    .on("mouseover", function (d, i) {
                //        svg.selectAll(".layer" ).transition()
                //            .duration(250)
                //            .attr("opacity", function (d, j) {
                //                return j != i ? 0.6 : 1;
                //            })
                //    });
            }
        });
    });
    themeLayer.addTo(map);
}
