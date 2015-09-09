Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

var genderMapping = {
    1: '男',
    2: '女',
    3: '不详'
};
var genderMappingLan ={'男':'male','女':'female','不详':'unknown'};

var statusMapping = {
    "1":	"死亡",
    "2":	"危重",
    "3":	"重症",
    "4":	"轻症",
    "5":	"治愈",
    "6":    "不详",
};

var  gender = {
    1: 'male',
    2: 'female',
    3: 'unknown'
};

var ageRange = {
    1: '1',
    2: '2',
    3:	'3',
    4:	'4',
    5:	'5',
    6:	'6',
    7:	'7',
    8:	'8',
    9:	'9',
};

var statusRange = {
    1:	"dead",
    2:	"veryheavy",
    3:	"heavy",
    4:	"light",
    5:	"good",
    6:"unknown",
};

// var birdflu = [];

var currentLengad;

//时间范围
var dateRange = ["2013-01-09", new Date().Format("yyyy-MM-dd")];

var symbolizers_lookup = {
    'male': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(91,192,222)',
        'fillOpacity': '1'
    },
    'female': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(217,83,79)',
        'fillOpacity': '1'
    }
};


var symbolizers_lookup_age = {
    '1': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(153,153,153)',
        'fillOpacity': '1'
    },
    '2': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(153,153,153)',
        'fillOpacity': '1'
    },
    '3': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(66,139,202)',
        'fillOpacity': '1'
    },
    '4': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(66,139,202)',
        'fillOpacity': '1'
    },
    '5': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(92,184,92)',
        'fillOpacity': '1'
    },
    '6': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(92,184,92)',
        'fillOpacity': '1'
    },
    '7': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(91,192,222)',
        'fillOpacity': '1'
    },
    '8': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(91,192,222)',
        'fillOpacity': '1'
    },
    '8': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(240,173,78)',
        'fillOpacity': '1'
    }
};

var symbolizers_lookup_status = {
    'dead': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(217,83,79)',
        'fillOpacity': '1'
    },
    'veryheavy': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(240,173,78)',
        'fillOpacity': '1'
    },
    'heavy': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(240,173,78)',
        'fillOpacity': '1'
    },
    'light': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(91,192,222)',
        'fillOpacity': '1'
    },
    'good': {
        'cursor':'pointer',
        'graphicName': 'circle',
        'pointRadius': '5',
        'strokeColor': '#C8C8C8',
        'strokeWidth': '1',
        'fillColor': 'RGB(92,184,92)',
        'fillOpacity': '1'
    }
};

var map, selectControl,epsg4326,projectTo,patientsLayer,heatmap;

var baselayerName = "Google Streets";
var heatmapData={
    max: 1,
    data: []
};

var c;

function bulidPatientsLayer(availableData){
    // patients layer
    if(patientsLayer)
        map.removeLayer(patientsLayer);
    patientsLayer = new OpenLayers.Layer.Vector('patients');
    var vector_style_map = new OpenLayers.StyleMap();
    vector_style_map.addUniqueValueRules('default', 'settlement_type',symbolizers_lookup);
    patientsLayer.styleMap = vector_style_map;

    selectControl = new OpenLayers.Control.SelectFeature(patientsLayer,
        {
            multiple: false,
            toggle: true,
            multipleKey: 'shiftKey',
            hover:false,
            clickout:true
        } );

    patientsLayer.addFeatures(createFeatures(availableData));
    patientsLayer.events.on({
        "featureselected" : function(e) {
            var px = map.getLayerPxFromLonLat(
                new OpenLayers.LonLat(116.172808, 40.0121105).transform(
                    new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()));
            var px2 = map.getLayerPxFromLonLat(
                new OpenLayers.LonLat(e.feature.geometry.bounds.left,e.feature.geometry.bounds.bottom));
            var patient = availableData[e.feature.attributes.id];
            //console.log(e.feature.attributes);
            //console.log(patient.city);
            if(patient.city == null) patient.city = "";
            if(patient.county == null) patient.county = "";
            if(patient.detailLocation == null) patient.detailLocation = "";
            var context = '患者:' + patient.name + '<br/>发病时间:'+new Date(patient.dateValue).Format("yyyy年MM月dd日")+'<br/>地址:'
                + patient.province +patient.city +patient.county
                + patient.detailLocation
                + '<br />情况描述:' + patient.desc
                + '<br />数据来源:';
            if(patient.sourceLink == null){
                context +=  '<a href=javascript:void(0); onclick=window.open("'+"http://health.sohu.com/s2013/qlg/"+'")>' + "http://health.sohu.com/s2013/qlg/" +'</a><br />';
            }else{
                context +=  '<a href=javascript:void(0); onclick=window.open("'+patient.sourceLink+'")>' + patient.sourceLink +'</a><br />';
            }
            var wraper = document.createElement('div');
            wraper.id="wraper";
            wraper.style.left=(px2.x-30)+'px';
            wraper.style.top=(px2.y-110)+'px';
            wraper.style.position='absolute';
            wraper.style.overflow='hidden';
            wraper.style.zIndex='751';
            wraper.style.width='450px';
            wraper.style.display="none";

            var bubbleshtml='<div style="height:20px;"></div><div style="text-align: left;padding-left:20px"><div class="bubble"><div class="content"  id="content">'+context+"</div></div></div>'";
            wraper.innerHTML=bubbleshtml;
            var parentDom=document.getElementById('OpenLayers_Map_2_OpenLayers_Container');
            parentDom.appendChild(wraper);
            //关闭按钮
            var content=document.getElementById('content');
            var wraper_colse = document.createElement('div');
            wraper_colse.id='wraper_colse';
            wraper_colse.className = "olPopupCloseBox";
            wraper_colse.style.height='17px';
            wraper_colse.style.position='absolute';
            wraper_colse.style.right="1px";
            wraper_colse.style.top='2px';
            wraper_colse.style.width='17px';
            wraper_colse.style.zIndex='1';
            content.appendChild(wraper_colse);
            $("#wraper").slideDown('slow');

            OpenLayers.Event.stop(e);
            // console.log("sel");
        },

        "featureunselected" : function(e) {
            // console.log("uns");
            c = document.getElementById('wraper');
            if(c)c.parentNode.removeChild(c);
        }
    });

    map.addLayer(patientsLayer);
    map.addControl(selectControl);
    selectControl.activate();
}

function recreateFeatureByDateArray(d){
    var patients = [];
    var k = 0;
    for ( var i = 0; i < birdflu.length; ++i) {
        for(var j = 0;j < d.length; ++j){
            if(birdflu[i].age == d[j].age &&
                birdflu[i].occupation == d[j].occupation &&
                birdflu[i].dateValue == d[j].date.getTime() &&
                birdflu[i].latitude == d[j].latitude &&
                birdflu[i].longitude == d[j].longitude){
                patients[k] = birdflu[i];
                k ++;
                continue;
            }
        }
    }
    bulidPatientsLayer(patients);

}

function createFeatures(availableData) {
    var features = [];
    for ( var i = 0; i < availableData.length; ++i) {
        var patient = availableData[i];
        features.push(new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(patient.longitude,patient.latitude).transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
                {  'settlement_type': gender[patient.sex], id: i }
            )
        );
    }
    return features;
}

/**
 * TODO 与原始创建代码有重复
 * 刷新feature
 * @param start 起始时间
 * @param end 终止时间
 **/
function recreateFeature(start, end){
    var features = [];
    var patients = [];
    var j = 0;
    for ( var i = 0; i < birdflu.length; ++i) {
        if(birdflu[i].dateValue > start.getTime() & birdflu[i].dateValue < end.getTime()){
            patients[j] = birdflu[i];
            j ++;
        }
    }
    bulidPatientsLayer(patients);
}




function changeFeature() {
    var start, end;
    if (brushBar.extent()[0].getTime() == brushBar.extent()[1].getTime()) {
        start = new Date(dateRange[0].substring(0, 4), dateRange[0].substring(5, 7), dateRange[0].substring(8, 10));
        end = new Date(dateRange[1].substring(0, 4), dateRange[1].substring(5, 7), dateRange[1].substring(8, 10));
    } else {
        start = brushBar.extent()[0];
        end = brushBar.extent()[1];
    }
    var t1 = document.getElementById("changefeature").getAttribute('class').indexOf('active');
    if (t1 == -1) {
        recreateFeature(start, end);
        patientsLayer.setVisibility(true);
    } else {

        patientsLayer.setVisibility(false);
    }
}


function changeHM(){
    var start,end;
    if(brushBar.extent()[0].getTime() == brushBar.extent()[1].getTime()){
        start = new Date(dateRange[0].substring(0,4), dateRange[0].substring(5, 7), dateRange[0].substring(8,10));
        end = new Date(dateRange[1].substring(0,4), dateRange[1].substring(5, 7), dateRange[1].substring(8,10));
    }else{
        start = brushBar.extent()[0] ;
        end = brushBar.extent()[1];
    }
    var t1 = document.getElementById("changeHM").getAttribute('class').indexOf('active');
    if(t1 == -1){
        recreateHeatmap(start, end);
        heatmap.setVisibility(true);
    }else{
        heatmap.setVisibility(false);
    }
}


/**
 * 创建Heatmap
 */
function createHeatmap(baseLayer){
    for(var i = 0; i < birdflu.length; i ++){
        heatmapData.data.push({
            lat:birdflu[i].latitude,
            lon:birdflu[i].longitude,
            count: 1
        });
    }
    var transformedTestData = { max: heatmapData.max , data: [] },
        data = heatmapData.data,
        datalen = data.length,
        nudata = [];
    while(datalen--){
        nudata.push({
            lonlat: new OpenLayers.LonLat(data[datalen].lon, data[datalen].lat).
                transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
            count: data[datalen].count
        });
    }
    transformedTestData.data = nudata;

    heatmap = new OpenLayers.Layer.Heatmap( "heatmap", map, baseLayer,
        {
            opacity:60,
            radius:20,
            gradient: {0.45: "rgb(0,0,255)", 0.55: "rgb(0,255,255)", 0.65: "rgb(0,255,0)", 0.95: "yellow", 1.0: "rgb(255,0,0)"}
            //0: "rgb(255,0,0)", 1.0: "rgb(255,100,100)" }
        }, {
            visible: true,
            isBaseLayer: false,
            alwaysInRange : true
        });

    heatmap.setDataSet(transformedTestData);
    map.addLayers([heatmap ]);
}

/**
 * TODO 与原始创建代码有重复
 * 刷新heatmap
 * @param start 起始时间
 * @param end 终止时间
 */
function recreateHeatmap(start, end){
    heatmapData.data.splice(0,heatmapData.data.length);
    for(var i = 0; i < birdflu.length; i ++){
        if(birdflu[i].dateValue > start.getTime() & birdflu[i].dateValue < end.getTime()){
            heatmapData.data.push({
                lat:birdflu[i].latitude,
                lon:birdflu[i].longitude,
                count: 1
            });
        }
    }
    var transformedTestData = { max: heatmapData.max , data: [] },
        data = heatmapData.data,
        datalen = data.length,
        nudata = [];
    while(datalen--){
        nudata.push({
            lonlat: new OpenLayers.LonLat(data[datalen].lon, data[datalen].lat).
                transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
            count: data[datalen].count
        });
    }
    transformedTestData.data = nudata;

    heatmap.setDataSet(transformedTestData);
}


function getBaseLayers(){
    var google = false;
    if(!google){
        //天地图
        tdt_layer1 = new OpenLayers.Layer.TiandituLayer("天地图","http://t5.tianditu.com/DataServer",{
            mapType:'vec_c',
            topLevel: 1,
            bottomLevel: 18,
            maxExtent: (new OpenLayers.Bounds(-180, -90, 180, 90)).transform(new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject()),
            mirrorUrls:["http://t0.tianditu.com/DataServer","http://t1.tianditu.com/DataServer","http://t2.tianditu.com/DataServer","http://t3.tianditu.com/DataServer","http://t4.tianditu.com/DataServer","http://t5.tianditu.com/DataServer","http://t6.tianditu.com/DataServer","http://t7.tianditu.com/DataServer"]
            //,transparent:true
        });
        tdt_layer2 = new OpenLayers.Layer.TiandituLayer("天地图","http://t7.tianditu.com/DataServer",{
            mapType:'cva_c',
            topLevel: 1,
            bottomLevel: 18,
            maxExtent: (new OpenLayers.Bounds(-180, -90, 180, 90)).transform(new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject()),
            mirrorUrls:["http://t0.tianditu.com/DataServer","http://t1.tianditu.com/DataServer","http://t2.tianditu.com/DataServer","http://t3.tianditu.com/DataServer","http://t4.tianditu.com/DataServer","http://t5.tianditu.com/DataServer","http://t6.tianditu.com/DataServer","http://t7.tianditu.com/DataServer"]
            ,//transparent:true,
            isBaseLayer:false
        });

        return [tdt_layer2,tdt_layer1];
    }else{
        // google streets map layer
        var baseLayer =  new OpenLayers.Layer.Google(baselayerName, // the default
            {
                minZoomLevel: 3,
                maxZoomLevel: 12,
                visibility : true
            });
        return [balseLayer];
    }
}


function init() {
    //转换为时间类型
    for(var i = 0; i < birdflu.length; i ++){
        var temp = birdflu[i].date;
        birdflu[i].date = new Date(temp.substring(0,4)+","+temp.substring(5,7)+","+temp.substring(8,10));
    }
    //initData(birdflu);
    //TODO 计算日期的范围

    $('#map').css('height',$(window).height()-$('#pageheader').height());
    $('#map').css('top', $('#pageheader').height());

    $('#showLegeadStatus').click(function(){
        $('#legendSex').hide();
        $('#legendAge').hide();
        $('#legendStatus').show();

    });

    $('#showLegeadSex').click(function(){
        $('#legendStatus').hide();
        $('#legendAge').hide();
        $('#legendSex').show();
    });

    $('#showLegeadAge').click(function(){
        $('#legendSex').hide();
        $('#legendStatus').hide();
        $('#legendAge').show();
    });

    map = new OpenLayers.Map('map');

    var baseLayers = getBaseLayers();
    var baseLayer = baseLayers[0];
    map.addLayers(baseLayers);



    var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
    renderer = (renderer) ? [ renderer ] : OpenLayers.Layer.Vector.prototype.renderers;
    bulidPatientsLayer(birdflu);
    map.setCenter(new OpenLayers.LonLat(105.6670345, 38.0121105).
        transform(new OpenLayers.Projection("EPSG:4326"), map.getProjectionObject()),3);

    createHeatmap(baseLayer);
}

function recreateHeatmapByDateArray(d){
    heatmapData.data.splice(0,heatmapData.data.length);
    for(var i = 0; i < d.length; i ++){
        heatmapData.data.push({
            lat:d[i].latitude,
            lon:d[i].longitude,
            count: 1
        });
    }

    var transformedTestData = { max: heatmapData.max , data: [] },
        data = heatmapData.data,
        datalen = data.length,
        nudata = [];
    while(datalen--){
        nudata.push({
            lonlat: new OpenLayers.LonLat(data[datalen].lon, data[datalen].lat).
                transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
            count: data[datalen].count
        });
    }
    transformedTestData.data = nudata;
    heatmap.setDataSet(transformedTestData);
}


function reloadFeatureLegeadAge(){
    if(currentLengad == "age"){
        return;
    }
    patientsLayer.styleMap.addUniqueValueRules('default', 'settlement_type_age',symbolizers_lookup_age);

    patientsLayer.removeAllFeatures();
    var start = brushBar.extent()[0];
    var end = brushBar.extent()[1];
    if(start.getTime() == end.getTime()){
        start = new Date(dateRange[0].substring(0,4), dateRange[0].substring(5, 7), dateRange[0].substring(8,10));
        end = new Date(dateRange[1].substring(0,4), dateRange[1].substring(5, 7), dateRange[1].substring(8,10));
    }



    var features = [];
    for ( var i = 0; i < birdflu.length; ++i) {
        if(birdflu[i].date > start & birdflu[i].date < end){
            var patient = birdflu[i];
            features.push(new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.Point(patient.longitude,patient.latitude).transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
                    {  'settlement_type_age': ageRange[Math.floor(patient.age/10)], id: i }
                )
            );
        }
    }
    patientsLayer.addFeatures(features);
    currentLengad = "age";
}

function reloadFeatureLegeadSex(){
    if(currentLengad == "sex")
        return;
    patientsLayer.styleMap.addUniqueValueRules('default', 'settlement_type',symbolizers_lookup);

    patientsLayer.removeAllFeatures();
    var start = brushBar.extent()[0];
    var end = brushBar.extent()[1];
    if(start.getTime() == end.getTime()){
        start = new Date(dateRange[0].substring(0,4), dateRange[0].substring(5, 7), dateRange[0].substring(8,10));
        end = new Date(dateRange[1].substring(0,4), dateRange[1].substring(5, 7), dateRange[1].substring(8,10));
    }



    var features = [];
    for ( var i = 0; i < birdflu.length; ++i) {
        if(birdflu[i].date > start & birdflu[i].date < end){
            var patient = birdflu[i];
            features.push(new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.Point(patient.longitude,patient.latitude).transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
                    {  'settlement_type': gender[patient.sex], id: i }
                )
            );
        }
    }
    patientsLayer.addFeatures(features);
    currentLengad = "sex";
}

function reloadFeatureLegeadStatus(){
    if(currentLengad == "status")
        return;
    patientsLayer.styleMap.addUniqueValueRules('default', 'settlement_type_status',symbolizers_lookup_status);

    patientsLayer.removeAllFeatures();
    var start = brushBar.extent()[0];
    var end = brushBar.extent()[1];
    if(start.getTime() == end.getTime()){
        start = new Date(dateRange[0].substring(0,4), dateRange[0].substring(5, 7), dateRange[0].substring(8,10));
        end = new Date(dateRange[1].substring(0,4), dateRange[1].substring(5, 7), dateRange[1].substring(8,10));
    }

    var features = [];
    for ( var i = 0; i < birdflu.length; ++i) {
        if(birdflu[i].date > start & birdflu[i].date < end){
            var patient = birdflu[i];
            features.push(new OpenLayers.Feature.Vector(
                    new OpenLayers.Geometry.Point(patient.longitude,patient.latitude).transform(new OpenLayers.Projection("EPSG:4326"),  map.getProjectionObject()),
                    {  'settlement_type_status': statusRange[patient.status], id: i }
                )
            );
        }
    }
    patientsLayer.addFeatures(features);
    currentLengad = "status";
}


function showLegeadAge(){
    console.log("show");
}

function showTimeSlider(){
    $("#pc").hide();
    $("#datecontrol").show();
}
