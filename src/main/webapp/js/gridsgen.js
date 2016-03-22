/**
 * Created by yidu on 3/22/16.
 */

var grids = [];
var WEST    =   73;
var EAST    =   135;
var SOUTH   =   4;
var NORTH   =   54;
var stepLon =   16;//longitude 经度
var stepLat =   9;
//var intervalHeri

var westUsed = WEST;
var eastUsed = EAST;
var southUsed = SOUTH;
var northUsed = NORTH;

/**
 * 根据限制条件初始化grids数据
 */
function initGrids(){
    var intervalHorizontal = (eastUsed - westUsed) / (stepLon*1.0);
    var intervalVertical = (northUsed - southUsed) / (stepLat*1.0);
    for(var i = 0; i < stepLon; i ++){
        grids[i] = [];
        for(var j = 0; j < stepLat; j ++){
            var oneGrid = {};
            oneGrid.west = westUsed + i * intervalHorizontal;
            oneGrid.east = oneGrid.west + intervalHorizontal;
            oneGrid.north = northUsed - j * intervalVertical;
            oneGrid.south = oneGrid.north - intervalVertical;
            grids[i][j] = oneGrid;
        }
    }
}

/**
 * 根据风向返回绘制时的坐标
 * @param direction
 */
//TODO direction是从什么位置开始?这个实现默认从北方开始
function windPath(direction){

    var wind = {};
    var intervalHorizontal = (eastUsed - westUsed) / (stepLon*1.0);
    var intervalVertical = (northUsed - southUsed) / (stepLat*1.0);
    var paddingHorizontal = 0.2 * intervalHorizontal;
    var paddingVertical = 0.2 * intervalVertical;

    if(direction > 45 && direction <= 90){
        wind.startX = intervalHorizontal - paddingHorizontal;
        wind.endX = paddingHorizontal;
        wind.startY = intervalVertical * 0.5 - (intervalHorizontal  - paddingHorizontal*2)/2 * Math.atan(Math.PI * direction / 180);
        wind.endY = intervalVertical - wind.startY;
        wind.value = 5;//TODO calculate
    }else if(direction > 90 && direction <= 135){
        wind.startX = intervalHorizontal - paddingHorizontal;
        wind.endX = paddingHorizontal;
        wind.startY = intervalVertical * 0.5 + (intervalHorizontal  - paddingHorizontal*2)/2 * Math.atan(Math.PI * (180-direction) / 180);
        wind.endY = intervalVertical - wind.startY;
        wind.value = 5;//TODO calculate
    }else if(direction > 135 && direction <= 180){
        wind.startX = intervalHorizontal * 0.5 + (intervalVertical - paddingVertical*2)/2 * Math.tan(Math.PI * (180 - direction) / 180);
        wind.endX = intervalHorizontal - wind.startX;
        wind.startY = intervalVertical - paddingVertical;
        wind.endY = paddingVertical;
        wind.value = 5;//TODO calculate
    }else if(direction > 180 && direction <= 225){
        wind.startX = intervalHorizontal * 0.5 - (intervalVertical - paddingVertical*2)/2 * Math.tan(Math.PI * (direction - 180) / 180);
        wind.endX = intervalHorizontal - wind.startX;
        wind.startY = intervalVertical - paddingVertical;
        wind.endY = paddingVertical;
        wind.value = 5;//TODO calculate
    }else if(direction > 225 && direction <= 270){
        wind.startX = paddingHorizontal;
        wind.endX = intervalHorizontal - paddingHorizontal;
        wind.startY = intervalVertical * 0.5 + (intervalHorizontal  - paddingHorizontal*2)/2 * Math.atan(Math.PI * (direction-180) / 180);
        wind.endY = intervalVertical - wind.startY;
        wind.value = 5;//TODO calculate
    }else if(direction > 270 && direction <= 315){
        wind.startX = paddingHorizontal;
        wind.endX = intervalHorizontal - paddingHorizontal;
        wind.startY = intervalVertical * 0.5 - (intervalHorizontal  - paddingHorizontal*2)/2 * Math.atan(Math.PI * (360 - direction) / 180);
        wind.endY = intervalVertical - wind.startY;
        wind.value = 5;//TODO calculate
    }else if(direction > 315 && direction <= 360){
        wind.startX = intervalHorizontal * 0.5 - (intervalVertical - paddingVertical*2)/2 * Math.tan(Math.PI * (360 - direction) / 180);
        wind.endX = intervalHorizontal - wind.startX;
        wind.startY = paddingVertical;
        wind.endY = intervalVertical - paddingVertical;
        wind.value = 5;//TODO calculate
    }else if(direction > 0 && direction <= 45){
        wind.startX = intervalHorizontal * 0.5 + (intervalVertical - paddingVertical*2)/2 * Math.tan(Math.PI * direction / 180);
        wind.endX = intervalHorizontal - wind.startX;
        wind.startY = paddingVertical;
        wind.endY = intervalVertical - paddingVertical;
        wind.value = 5;//TODO calculate
    }
    return wind;
}