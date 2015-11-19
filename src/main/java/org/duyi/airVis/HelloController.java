package org.duyi.airVis;

import com.mongodb.*;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.mongodb.util.JSON;
import org.apache.commons.io.FileUtils;
import org.bson.BSONObject;
import org.bson.Document;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.text.*;

@Controller
public class HelloController {
    private String SERVER_IP = "127.0.0.1";//192.168.16.71
    private static final String CITY_PATH = "d:\\city.txt";//home/duyi/city.txt;
    private static MongoClient client = new MongoClient("127.0.0.1");
    //a variable used to store all station info
    private HashMap<String, StationInfo> stations = null;

    private static final String DB_NAME = "pm";
    private static final String COL_LOCATION_BAIDU = "loc_ll_g_b";
    private static final String COL_AVG_YEAR = "pmdata_year";
    private static final String COL_AVG_MONTH = "pmdata_month";
    private static final String COL_AVG_DAY = "pmdata_day";

    /**
     * 返回所有城市列表
     * modified by yidu at Purdue
     * @return [{},{}]
     */
    @RequestMapping("cities.do")
    public @ResponseBody String getAllCities() {
        MongoCollection coll = getCollection(COL_LOCATION_BAIDU);
        MongoCursor cur = coll.find().iterator();
        JSONObject onecity;
        JSONArray result = new JSONArray();
        Document d;
        while(cur.hasNext()){
            d = (Document)cur.next();
            onecity = new JSONObject();
            try {
                onecity.put("city", d.getString("city"));
                onecity.put("station", d.getString("name"));
                onecity.put("longitude", d.getDouble("lon"));
                onecity.put("latitude", d.getDouble("lat"));
                onecity.put("code", d.getString("code"));
            } catch (JSONException e) {
                e.printStackTrace();
            }
            result.put(onecity);
        }

        return result.toString();
    }



    /**
     * generate all stations info
     */
    private void generateStations(){
        if(stations != null)
            return;
        MongoCollection coll = getCollection(COL_LOCATION_BAIDU);
        MongoCursor cur = coll.find().iterator();
        Document d;
        stations = new HashMap<String, StationInfo>();
        StationInfo oneStation;
        while(cur.hasNext()){
            d = (Document)cur.next();
            oneStation = new StationInfo();
            oneStation.setCity(d.getString("city"));
            oneStation.setName(d.getString("name"));
            oneStation.setLatitude(d.getDouble("lat"));
            oneStation.setLongitude(d.getDouble("lon"));
            oneStation.setCode(d.getString("code"));
            stations.put(oneStation.getCode(), oneStation);
        }
    }


    private MongoCollection getCollection(String collName){
        MongoDatabase db = client.getDatabase(DB_NAME);
        MongoCollection coll = db.getCollection(collName);
        return coll;
    }
    /**
     * @return 所有监测站的平均值
     * modified by Yi Du at Purdue
     */
    @RequestMapping("yearAvg_v2.do")
    public
    @ResponseBody
    String getYearAvgV2() {
        if(stations == null)
            generateStations();
        MongoCollection coll = getCollection(COL_AVG_YEAR);
        MongoCursor cur = coll.find().iterator();
        JSONArray result = new JSONArray();
        JSONObject oneResult;
        Document d;
        StationInfo oneStation = null;
        while(cur.hasNext()){
            d = (Document)cur.next();
            oneResult = new JSONObject();
            oneStation = stations.get(d.getString("code"));
            if(oneStation == null)
                continue;
            try {
                oneResult.put("aqi", d.getDouble("aqi"));
                oneResult.put("co", d.getDouble("co"));
                oneResult.put("no2", d.getDouble("no2"));
                oneResult.put("o3", d.getDouble("o3"));
                oneResult.put("pm10", d.getDouble("pm10"));
                oneResult.put("pm25", d.getDouble("pm25"));
                oneResult.put("so2", d.getDouble("so2"));
                oneResult.put("city", oneStation.getCity());
                oneResult.put("station", oneStation.getName());
                oneResult.put("longitude", oneStation.getLongitude());
                oneResult.put("latitude", oneStation.getLatitude());
                oneResult.put("code", oneStation.getCode());
                result.put(oneResult);
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
        return result.toString();
    }

    /**
     * 根据城市约束返回按月的趋势
     * http://localhost:8081/monthTrends_v2.do?codes[]=1010A&codes[]=1011A
     * @param codes 站点代码
     * @return
     */
    @RequestMapping("monthTrends_v2.do")
    public
    @ResponseBody
    String getMonthTrendsV2(@RequestParam(value="codes[]", required=false)String[] codes) {
        MongoCollection coll = getCollection(COL_AVG_MONTH);

        Document match;
        Document sort = new Document("$sort", new Document("time", 1));
        Document group = new Document().append("$group",
                new Document().append("_id",
                        new Document().append("month", new Document("$month", "$time"))
                                .append("year", new Document("$year","$time")))
                        .append("time", new Document("$first", "$time"))
                        .append("aqi", new Document("$avg", "$aqi"))
                        .append("aqi", new Document("$avg", "$aqi"))
                        .append("co", new Document("$avg", "$co"))
                        .append("no2", new Document("$avg", "$no2"))
                        .append("o3", new Document("$avg", "$o3"))
                        .append("pm10", new Document("$avg", "$pm10"))
                        .append("pm25", new Document("$avg", "$pm25"))
                        .append("so2", new Document("$avg", "$so2")));
        List<Document> query = new ArrayList<Document>();
        MongoCursor cur;
        JSONArray result = new JSONArray();
        if (codes == null || codes.length == 0){
            query.add(group);
            query.add(sort);
            cur = coll.aggregate(query).iterator();
        }
        else {
            match = new Document("$match",new Document("code", new Document("$in", Arrays.asList(codes))));
            query.add(match);
            query.add(group);
            query.add(sort);
            cur = coll.aggregate(query).iterator();
        }
        while(cur.hasNext()){
            result.put(cur.next());
        }
        return result.toString();
    }


    /**
     * 根据时间区间、城市代码返回日趋势
     *
     * @param
     * @param codes    城市代码，即城市名称
     *                 created at Purdue
     */
    @RequestMapping("dayTrendsByCodes_v2.do")
    public
    @ResponseBody
    String getDayTrendsByCodesV2(@RequestParam(value="startTime", required=false) String startTime,
                                 @RequestParam(value="endTime", required=false) String endTime,
                                 @RequestParam(value="codes[]", required=false) String[] codes) {
        MongoCollection coll = getCollection(COL_AVG_DAY);

        Document match;
        Document sort = new Document("$sort", new Document("time", 1));
        Document group = new Document().append("$group",
                new Document().append("_id",
                        new Document().append("day", new Document("$dayOfMonth", "$time"))
                                .append("month", new Document("$month", "$time"))
                                .append("year", new Document("$year","$time")))
                        .append("time", new Document("$first", "$time"))
                        .append("aqi", new Document("$avg", "$aqi"))
                        .append("aqi", new Document("$avg", "$aqi"))
                        .append("co", new Document("$avg", "$co"))
                        .append("no2", new Document("$avg", "$no2"))
                        .append("o3", new Document("$avg", "$o3"))
                        .append("pm10", new Document("$avg", "$pm10"))
                        .append("pm25", new Document("$avg", "$pm25"))
                        .append("so2", new Document("$avg", "$so2")));
        List<Document> query = new ArrayList<Document>();
        MongoCursor cur;
        JSONArray result = new JSONArray();

        if(startTime == null && endTime == null && codes == null){
            query.add(group);
            query.add(sort);
            cur = coll.aggregate(query).iterator();
        }else if(startTime == null && endTime == null  && codes != null){
            match = new Document("$match",new Document("code", new Document("$in", Arrays.asList(codes))));
            query.add(match);
            query.add(group);
            query.add(sort);
            cur = coll.aggregate(query).iterator();
        }else if(startTime == null && endTime != null  && codes == null){
            //TODO
            cur = null;
        }else{
            //TODO
            cur = null;
        }

        while(cur.hasNext()){
            result.put(cur.next());
        }
        return result.toString();
    }


    /**
     * 根据日期、小时、站点代码返回趋势
     *
     * @param startTime，格式：2014-01-01 起始时间
     * @param endTime                 格式：同上 结束时间
     * @param codes            站点代码
     * @return
     */
    @RequestMapping("hourTrendsv2.do")
    public
    @ResponseBody
    String getHourTrendsByCodesV2(String startTime, String endTime,
                                  @RequestParam(value="codes[]", required=false) String[] codes) {

        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd");
        long start = 0L, end = 0L;
        try {
            start = df.parse(startTime).getTime();
            end = df.parse(endTime).getTime();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return "";
    }

    /**
     * @param cities 城市名数组
     * @return 返回特定城市的经纬度
     * 20150120
     * 未测试
     */
    @RequestMapping("getCityLocation.do")
    public @ResponseBody String getCityLocation(String[] cities) {
        List<String> array = getCities();
        Iterator itr = array.iterator();
        JSONArray result = new JSONArray();
        JSONObject oneResult;
        //String[] cities={"天津","石家庄"};
        //String s="天津";
        String cityDetail;
        String city;
        String[] detail;
        for (String s : cities) {
            while (itr.hasNext()) {
                cityDetail = (String) itr.next();
                detail = cityDetail.split(",");
                city = detail[0];
                try {
                    if (s.equals(city)) {
                        oneResult = new JSONObject();
                        oneResult.put("city", s);
                        oneResult.put("station", detail[1]);
                        oneResult.put("lon", Double.parseDouble(detail[2]));
                        oneResult.put("lat", Double.parseDouble(detail[3]));
                        oneResult.put("code", detail[4]);
                        result.put(oneResult);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }
        return result.toString();
    }



    /**
     * 返回所有城市的List，包括城市名、经纬度
     *
     * @return
     */
    private List<String> getCities() {
        List<String> cities = null;
        try {
            cities = FileUtils.readLines(new File(CITY_PATH), "utf-8");
        } catch (IOException e) {
            e.printStackTrace();
        }
        return cities;
    }

    /**
     * @param timeList    必填参数  例：  年：2014  月2014-01   日：2014-01-01
     * @param areaList    城市名称 例：  北京
     * @param stationList 站点名称 例：1024A
     * @param airList     mongo数据库里字段名称  例：no2_min 或 co_max
     * @return
     */
    @RequestMapping("year.do")
    public
    @ResponseBody
    String getYear(String[] timeList, String[] areaList, String[] stationList, String[] airList) {
        JSONArray result = new JSONArray();
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection year = db.getCollection("pmdata_year");
        DBCollection month = db.getCollection("pmdata_month");
        DBCollection day = db.getCollection("pmdata_day");
        DBObject ref = new BasicDBObject();
        DBObject key = new BasicDBObject();
        if (timeList != null) {
            BasicDBList values = new BasicDBList();
            for (String time : timeList) {
                values.add(time);
            }
            ref.put("time_point", new BasicDBObject("$in", values));
        }
        if (areaList != null) {
            BasicDBList values = new BasicDBList();
            //向values添加城市列表
            for (String area : areaList) {
                values.add(area);
            }
            ref.put("area", new BasicDBObject("$in", values));
        }
        if (stationList != null) {
            BasicDBList values = new BasicDBList();
            //向values添加站点编号
            for (String position : stationList) {
                values.add(position);
            }
            ref.put("station_code", new BasicDBObject("$in", values));
        }
        if (airList != null) {
            for (String air : airList) {
                key.put(air, 1);
            }
        }
        key.put("time_point", 1);
        key.put("longitude", 1);
        key.put("latitude", 1);
        key.put("position_name", 1);
        key.put("station_code", 1);
        key.put("area", 1);
        key.put("pm25_ave", 1);
        DBCursor cursor = null;
        if (timeList[0].length() == 4) {
            cursor = year.find(ref, key);
        } else if (timeList[0].length() == 7) {
            cursor = month.find(ref, key);
        } else if (timeList[0].length() == 10) {
            cursor = day.find(ref, key);
        }

        JSONObject oneResult;
        DBObject oneObj;
        double max = 0;
        while (cursor.hasNext()) {
            oneResult = new JSONObject();
            oneObj = cursor.next();
            //判断是否所有键都存在
            if (oneObj.get("longitude") == null || oneObj.get("latitude") == null ||
                    oneObj.get("position_name") == null || oneObj.get("pm25_ave") == null)
                continue;
            //keySet方法获取map所有的K值
            Set<String> i = oneObj.keySet();
            for (String k : i) {
                try {
                    oneResult.put(k, oneObj.get(k));
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            if (max < Double.parseDouble(oneObj.get("pm25_ave").toString()))
                max = Double.parseDouble(oneObj.get("pm25_ave").toString());
            result.put(oneResult);
        }
        JSONObject parsedResult = new JSONObject();

        try {
            parsedResult.put("max", max);
            parsedResult.put("data", result);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return parsedResult.toString();
    }

//    /**
//     * @return 所有监测站的pm25年平均值
//     * modified by Yi Du at Purdue
//     */
//    @RequestMapping("yearAvg.do")
//    public
//    @ResponseBody
//    String getYearAvg() {
//        MongoCollection coll = getLocationCollection();
//        MongoCursor cur = coll.find().iterator();
//
//        JSONArray result = new JSONArray();
//
//        MongoClient mongo = null;
//        try {
//            mongo = new MongoClient(SERVER_IP);
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
//        DB db = mongo.getDB("pmdata_2014");
//        DBCollection collection = db.getCollection("pmdata_year");
//        DBObject ref = new BasicDBObject();
//        DBObject key = new BasicDBObject();
//        key.put("longitude", 1);
//        key.put("latitude", 1);
//        key.put("position_name", 1);
//        key.put("pm25_ave", 1);
//        DBCursor cursor = collection.find(ref, key);
//
//        JSONObject oneResult;
//        DBObject oneObj;
//        double max = 0;
//        while (cursor.hasNext()) {
//            oneResult = new JSONObject();
//            oneObj = cursor.next();
//            //判断是否所有键都存在
//            if (oneObj.get("longitude") == null || oneObj.get("latitude") == null ||
//                    oneObj.get("position_name") == null || oneObj.get("pm25_ave") == null)
//                continue;
//            //keySet方法获取map所有的K值
//            Set<String> i = oneObj.keySet();
//            for (String k : i) {
//                try {
//                    oneResult.put(k, oneObj.get(k));
//                } catch (JSONException e) {
//                    e.printStackTrace();
//                }
//            }
//            if (max < Double.parseDouble(oneObj.get("pm25_ave").toString()))
//                max = Double.parseDouble(oneObj.get("pm25_ave").toString());
//            result.put(oneResult);
//        }
//        JSONObject parsedResult = new JSONObject();
//
//        try {
//            parsedResult.put("max", max);
//            parsedResult.put("data", result);
//        } catch (JSONException e) {
//            e.printStackTrace();
//        }
//        return parsedResult.toString();
//    }

    @RequestMapping(value = "hourOfWeekAverage.do", method = RequestMethod.POST)
    public @ResponseBody String getHourOfWeekAverage(String[] cities,String startTime, String endTime){
//TODO
        return "";
    }




    /**
     * @return 得到按年统计的结果，包含所有字段
     *
     */

    @RequestMapping("yearSummary.do")
    public
    @ResponseBody
    String getYearSummary() {
        JSONArray result = new JSONArray();

        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_year");
        DBObject ref = new BasicDBObject();
        DBObject key = new BasicDBObject();
        key.put("longitude", 1);
        key.put("latitude", 1);
        key.put("position_name", 1);
        key.put("station_code", 1);
        key.put("pm25_ave", 1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);
        DBCursor cursor = collection.find(ref, key);
        JSONObject oneResult;
        DBObject oneObj;
        double max = 0;
        while (cursor.hasNext()) {
            oneResult = new JSONObject();
            oneObj = cursor.next();
            //判断是否所有键都存在
            if (oneObj.get("longitude") == null || oneObj.get("latitude") == null ||
                    oneObj.get("position_name") == null || oneObj.get("pm25_ave") == null)
                continue;
            Set<String> i = oneObj.keySet();
            for (String k : i) {
                try {
                    oneResult.put(k, oneObj.get(k));
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            if (max < Double.parseDouble(oneObj.get("pm25_ave").toString()))
                max = Double.parseDouble(oneObj.get("pm25_ave").toString());
            result.put(oneResult);
        }
        JSONObject parsedResult = new JSONObject();
        try {
            parsedResult.put("max", max);
            parsedResult.put("data", result);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return parsedResult.toString();
    }

    /**
     * @return 得到按年统计的结果，包含所有字段
     * 所有站点平均
     *
     */

    @RequestMapping("yearSummary2.do")
    public
    @ResponseBody
    String getYearSummary2() {
        JSONArray result = new JSONArray();

        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_year");
        DBObject ref = new BasicDBObject();
        DBObject key = new BasicDBObject();
//        key.put("longitude", 1);
//        key.put("latitude", 1);
//        key.put("position_name", 1);
        key.put("pm25_ave", 1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);
        DBCursor cursor = collection.find(ref, key);
        JSONObject oneResult;
        DBObject oneObj;
        double max = 0;
        while (cursor.hasNext()) {
            oneResult = new JSONObject();
            oneObj = cursor.next();
            //判断是否所有键都存在
            if (oneObj.get("longitude") == null || oneObj.get("latitude") == null ||
                    oneObj.get("position_name") == null || oneObj.get("pm25_ave") == null)
                continue;
            Set<String> i = oneObj.keySet();
            for (String k : i) {
                try {
                    oneResult.put(k, oneObj.get(k));
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            if (max < Double.parseDouble(oneObj.get("pm25_ave").toString()))
                max = Double.parseDouble(oneObj.get("pm25_ave").toString());
            result.put(oneResult);
        }
        JSONObject parsedResult = new JSONObject();
        try {
            parsedResult.put("max", max);
            parsedResult.put("data", result);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return parsedResult.toString();
    }

    /**
     * 根据约束返回按月的趋势
     *
     * @param codes 站点代码
     * @return
     */
//    db.pm_month.group({
//        'key':{'time_point':true},
//        'reduce':function(obj,out){out.csum += obj.pm25_ave;out.ccount++;},
//        'initial':{'csum':0,'ccount':0},
//        'finalize':function(out){
//            out.avg_time=out.csum/out.ccount;
//        }
//    })
    @RequestMapping("monthTrends.do")
    public
    @ResponseBody
    String getMonthTrends(String[] codes) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_month");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        String reduce = "function(obj,out){out.csum += obj.pm25_ave;out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("csum", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){\n" +
                "out.pm25_ave=out.csum/out.ccount;\n" +
                "}";

        DBObject result;
        if (codes == null || codes.length == 0)
            result = collection.group(key, null, initial, reduce, finalize);
        else {
            DBObject cond = new BasicDBObject();
            cond.put("station_code", new BasicDBObject("$in", codes));
            result = collection.group(key, cond, initial, reduce, finalize);
        }
        return result.toString();
    }

    /**
     * 根据约束返回日趋势
     *
     * @return
     */
//    db.pm_day.aggregate(
//            [
//    {$match:{"time_point":{$in:['2014-01-01','2014-01-02']}}},
//    {$group:{
//        _id:{time_point:"$time_point",station_code:"$station_code"},
//        value:{$avg:"$pm25_ave"}
//    }},
//    {$sort:{"time_point":1}}
//    ])
//
//    db.pm_day.group({
//        'key':{'time_point':true},
//        'reduce':function(obj,out){out.csum += obj.pm25_ave;out.ccount++;},
//        'initial':{'csum':0,'ccount':0},
//        'cond':{"time_point":{$in:['2014-01-01','2014-01-02']}},
//        'finalize':function(out){
//            out.avg_time=out.csum/out.ccount;
//        }
//    })
    @RequestMapping("dayTrends.do")
    public
    @ResponseBody
    String getDayTrends(String[] timeList) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        String reduce = "function(obj,out){out.csum += obj.pm25_ave;out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("csum", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){\n" +
                "out.avg_time=out.csum/out.ccount;\n" +
                "}";
        DBObject cond = new BasicDBObject();
        cond.put("time_point", new BasicDBObject("$in", timeList));
        DBObject result;
        if (timeList == null || timeList.length == 0)
            result = collection.group(key, null, initial, reduce, finalize);
        else
            result = collection.group(key, cond, initial, reduce, finalize);

        return result.toString();
    }


    /**
     * 根据时间区间、城市代码返回日趋势
     *
     * @param timeList 时间，格式：2014-01-01
     * @param codes    城市代码，即城市名称
     */
    @RequestMapping("dayTrendsByCodes.do")
    public
    @ResponseBody
    String getDayTrendsByCodes(String[] timeList, String codes) {
        //String[] timeList={"2014-01-01","2014-01-02"};
        //String codes="天津";
        //参数为空的情况
        //String[] timeList=null;
        //String codes=null;
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();

        String reduce = "function(obj,out){out.csum += obj.pm25_ave;out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("csum", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){\n" +
                "out.avg_time=out.csum/out.ccount;\n" +
                "}";
        DBObject cond = new BasicDBObject();

        DBObject result;
        key.put("time_point", true);
        key.put("area", true);

        if (timeList == null && codes == null) {  //若参数为空，则返回所有时间段的所有城市的平均日趋势数据
            result = collection.group(key, null, initial, reduce, finalize);
        } else if (timeList != null && codes == null) {  //若时间为非空，则返回该时间的所有城市的值
            cond.put("time_point", new BasicDBObject("$in", timeList));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (timeList == null && codes != null) { //若城市非空，则返回该城市的值
            cond.put("area", codes);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("time_point", new BasicDBObject("$in", timeList));
            cond.put("area", codes);
            result = collection.group(key, cond, initial, reduce, finalize);
        }
        return result.toString();
    }


    /**
     * 根据时间区间、站点代码返回日趋势
     *
     * @param timeList     时间
     * @param station_code 站点代码
     */
    @RequestMapping("dayTrendsByStationCodes.do")
    public
    @ResponseBody
    String getDayTrendsByStationCode(String[] timeList, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        key.put("station_code", true);
        key.put("position_name", true);
        key.put("area", true);
        key.put("time_point", true);
        key.put("pm25_ave", true);

        //空值判断
        if ((timeList == null || timeList.length == 0) && station_code == null)  //时间和站点全部为空时,返回每天所有站点的平均值(数据量太大,key值超过20000会报错，设定参数返回)
        {
            String[] timeList2 = {"2014-01-01", "2014-01-02", "2014-01-03", "2014-01-04"};
            cond.put("time_point", new BasicDBObject("$in", timeList2));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if ((timeList == null || timeList.length == 0) && station_code != null)  //时间为空，站点非空，返回站点每一天的平均值
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (timeList != null && timeList.length != 0 && station_code == null)  //时间非空，站点为空，返回每天所有站点的值
        {
            cond.put("time_point", new BasicDBObject("$in", timeList));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("time_point", new BasicDBObject("$in", timeList));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }

    /**
     * 根据时间区间、站点代码返回全部检测项的数据
     *
     * @param timeList     时间
     * @param station_code 站点代码
     */
    @RequestMapping("dayTrendsByStationCodes2.do")
    public
    @ResponseBody
    String getDayTrendsByStationCode2(String[] timeList, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        key.put("station_code", true);
        key.put("time_point", true);
        key.put("pm25_ave",1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);

        //空值判断
        if ((timeList == null || timeList.length == 0) && station_code == null)  //时间和站点全部为空时,返回每天所有站点的平均值(数据量太大,key值超过20000会报错，设定参数返回)
        {
            String[] timeList2 = {"2014-01-01", "2014-01-02", "2014-01-03", "2014-01-04"};
            cond.put("time_point", new BasicDBObject("$in", timeList2));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if ((timeList == null || timeList.length == 0) && station_code != null)  //时间为空，站点非空，返回站点每一天的平均值
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (timeList != null && timeList.length != 0 && station_code == null)  //时间非空，站点为空，返回每天所有站点的值
        {
            cond.put("time_point", new BasicDBObject("$in", timeList));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("time_point", new BasicDBObject("$in", timeList));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }

    /**
     * db.pmdata_day.group({
     'key':{'time_point':true},
     'reduce':function(obj,out){out.csum += obj.pm25_ave;out.ccount++;},
     'initial':{'csum':0,'ccount':0},
     'cond':{"station_code":{$in:['1490A','1491A']}},
     'finalize':function(out){
     out.avg_time=out.csum/out.ccount;
     }
     })
     */
    /**
     * 根据站点代码返回日趋势
     *
     * @param station_code 站点代码
     *                     by yidu 添加只有站点参数的，默认返回全部时间段，
     *                     减小key值太多的问题，但未根本解决
     */
    @RequestMapping("allDayTrendsByStationCodes.do")
    public
    @ResponseBody
    String getAllDayTrendsByStationCode(String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();

        String reduce = "function(obj,out){out.csum += obj.pm25_ave;out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("csum", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){\n" +
                "out.pm25_ave=out.csum/out.ccount;\n" +
                "}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        key.put("time_point", true);

        //空值判断
        if (station_code == null)  //时间和站点全部为空时,返回每天所有站点的平均值(数据量太大,key值超过20000会报错，设定参数返回)
        {
            cond.put("time_point", new BasicDBObject("$in", station_code));
            result = collection.group(key, null, initial, reduce, finalize);
        } else {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    /**
     * 根据站点代码返回其他所有检测值的日趋势
     *
     * @param station_code 站点代码
     *                     by yidu 添加只有站点参数的，默认返回全部时间段，
     *                     减小key值太多的问题，但未根本解决
     */
    @RequestMapping("allDayTrendsByStationCodes2.do")
    public
    @ResponseBody
    String getAllDayTrendsByStationCode2(String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();

        String reduce = "function(obj,out){out.pm25+=obj.pm25_ave;" +
                "out.aqi += obj.aqi_ave;" +
                "out.no2 += obj.no2_ave;" +
                "out.o3 += obj.o3_ave;" +
                "out.pm10 += obj.pm10_ave;" +
                "out.so2 += obj.so2_ave;" +
                "out.co += obj.co_ave;" +
                "out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("pm25",0);
        initial.put("aqi", 0);
        initial.put("no2", 0);
        initial.put("o3", 0);
        initial.put("pm10", 0);
        initial.put("so2", 0);
        initial.put("co", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){\n" +
                "out.pm25_ave=out.pm25/out.ccount;\n"+
                "out.aqi_ave=out.aqi/out.ccount;\n" +
                "out.no2_ave=out.no2/out.ccount;\n" +
                "out.o3_ave=out.o3/out.ccount;\n" +
                "out.pm10_ave=out.pm10/out.ccount;\n" +
                "out.so2_ave=out.so2/out.ccount;\n" +
                "out.co_ave=out.co/out.ccount;\n" +
                "}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        key.put("time_point", true);

        //空值判断
        if (station_code == null)  //时间和站点全部为空时,返回每天所有站点的平均值(数据量太大,key值超过20000会报错，设定参数返回)
        {
            cond.put("time_point", new BasicDBObject("$in", station_code));
            result = collection.group(key, null, initial, reduce, finalize);
        } else {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    /**
     * 根据时间区间、站点代码返回日趋势统计数据（平均值，最大值和最小值）
     *
     * @param timeList     时间
     * @param station_code 站点代码
     */
    @RequestMapping("Statistic_dayTrendsByStationCodes.do")
    public
    @ResponseBody
    String getStatistic_DayTrendsByStationCode(String[] timeList, String[] station_code) {
        if (timeList == null && station_code == null) {
            return DayStatistic("2014-01-01", null).toString();
        } else if (timeList != null && station_code == null) {
            DBObject list = new BasicDBObject();
            for (int i = 0; i < timeList.length; i++) {
                list.put(timeList[i], DayStatistic(timeList[i], null));
            }
            return list.toString();
        } else if (timeList == null && station_code != null)  //时间为空，站点非空，返回该站点在第一个月的每一天的的平均值，最大值和最小值
        {
            DBObject list = new BasicDBObject();
            for (int i = 1; i <= 31; i++) {
                if (i <= 9)
                    list.put("2014-01-0" + i, DayStatistic("2014-01-0" + i, station_code));
                else
                    list.put("2014-01-" + i, DayStatistic("2014-01-" + i, station_code));
            }
            return list.toString();
        } else {
            DBObject list = new BasicDBObject();
            for (int i = 0; i < timeList.length; i++) {
                list.put(timeList[i], DayStatistic(timeList[i], station_code));
            }
            return list.toString();
        }
    }


    /**
     * 返回按日统计的信息
     *
     * @return
     */
    public DBObject DayStatistic(String timeList, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject cond = new BasicDBObject();
        cond.put("time_point", timeList);
        if (station_code != null)
            cond.put("station_code", new BasicDBObject("$in", station_code));
        DBCursor cursor = collection.find(cond);
        DBObject obj;
        DBObject result = new BasicDBObject();
        DBObject maxresult = null;
        DBObject minresult = null;
        double max = 0;
        double min = 1000;
        double sumpm25 = 0;
        double pm25_ave = 0;
        int count = 0;
        while (cursor.hasNext()) {
            obj = cursor.next();
            pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
            if (pm25_ave > max) {
                max = pm25_ave;
                maxresult = obj;
            }
            if (pm25_ave < min) {
                min = pm25_ave;
                minresult = obj;
            }
            sumpm25 += pm25_ave;
            count++;
        }
        result.put("max", maxresult);
        result.put("min", minresult);
        result.put("ave", sumpm25 / count);
        return result;
    }


    /**
     * 根据时间区间、站点代码返回日趋势，包含全部检测项数据（平均值，最大值和最小值）
     *
     * @param timeList     时间
     * @param station_code 站点代码
     *                     如果timeList和station_code都为空，则返回2014-01-01的统计信息
     *                     时间和站点代码都不为空时，返回的是每天所有站点的统计数据
     */
    @RequestMapping("Statistic_dayTrendsByStationCodes2.do")
    public
    @ResponseBody
    String getStatistic_DayTrendsByStationCode2(String[] timeList, String[] station_code) {
        if (timeList == null && station_code == null) {
            return DayStatistic2("2014-01-01", null).toString();
        } else if (timeList != null && station_code == null) {
            DBObject list = new BasicDBObject();
            for (int i = 0; i < timeList.length; i++) {
                list.put(timeList[i], DayStatistic2(timeList[i], null));
            }
            return list.toString();
        } else if (timeList == null && station_code != null)  //时间为空，站点非空，返回该站点在第一个月的每一天的的平均值，最大值和最小值
        {
            DBObject list = new BasicDBObject();
            for (int i = 1; i <= 31; i++) {
                if (i <= 9)
                    list.put("2014-01-0" + i, DayStatistic2("2014-01-0" + i, station_code));
                else
                    list.put("2014-01-" + i, DayStatistic2("2014-01-" + i, station_code));
            }
            return list.toString();
        } else {
            DBObject list = new BasicDBObject();
            for (int i = 0; i < timeList.length; i++) {
                list.put(timeList[i], DayStatistic2(timeList[i], station_code));
            }
            return list.toString();
        }
    }


    /**
     * 返回按日统计的信息
     *
     * @return
     */
    public DBObject DayStatistic2(String timeList, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject cond = new BasicDBObject();
        cond.put("time_point", timeList);
        if (station_code != null)
            cond.put("station_code", new BasicDBObject("$in", station_code));
        DBCursor cursor = collection.find(cond);
        DBObject obj;
        DBObject result = new BasicDBObject();

        double max_pm25=0,max_aqi = 0, max_no2 = 0, max_pm10 = 0, max_co = 0, max_o3 = 0, max_so2 = 0;
        double min_pm25=1000,min_aqi = 1000, min_no2 = 1000, min_pm10 = 1000, min_co = 1000, min_o3 = 1000, min_so2 = 1000;
        double sum_pm25=0,sum_aqi = 0, sum_no2 = 0, sum_pm10 = 0, sum_co = 0, sum_o3 = 0, sum_so2 = 0;
        double pm25_ave=0,aqi_ave = 0, no2_ave = 0, pm10_ave = 0, co_ave = 0, o3_ave = 0, so2_ave = 0;
        int count = 0;
        while (cursor.hasNext()) {
            obj = cursor.next();
            pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
            aqi_ave = Double.valueOf(obj.get("aqi_ave").toString());
            no2_ave = Double.valueOf(obj.get("no2_ave").toString());
            pm10_ave = Double.valueOf(obj.get("pm10_ave").toString());
            co_ave = Double.valueOf(obj.get("co_ave").toString());
            o3_ave = Double.valueOf(obj.get("o3_ave").toString());
            so2_ave = Double.valueOf(obj.get("so2_ave").toString());
            if(pm25_ave>max_pm25)
                max_pm25=pm25_ave;
            else if(pm25_ave<min_pm25)
                min_pm25=pm25_ave;

            if (aqi_ave > max_aqi)
                max_aqi = aqi_ave;
            else if (aqi_ave < min_aqi)
                min_aqi = aqi_ave;

            if (no2_ave > max_no2)
                max_no2 = no2_ave;
            else if (no2_ave < min_no2)
                min_no2 = no2_ave;

            if (pm10_ave > max_pm10)
                max_pm10 = pm10_ave;
            else if (pm10_ave < min_pm10)
                min_pm10 = pm10_ave;

            if (co_ave > max_co)
                max_co = co_ave;
            else if (co_ave < min_co)
                min_co = co_ave;

            if (o3_ave > max_o3)
                max_o3 = o3_ave;
            else if (o3_ave < min_o3)
                min_o3 = o3_ave;

            if (so2_ave > max_so2)
                max_so2 = so2_ave;
            else if (so2_ave < min_so2)
                min_so2 = so2_ave;

            sum_pm25+=pm25_ave;
            sum_aqi += aqi_ave;
            sum_no2 += no2_ave;
            sum_pm10 += pm10_ave;
            sum_co += co_ave;
            sum_o3 += o3_ave;
            sum_so2 += so2_ave;
            count++;
        }
        result.put("max_pm25", max_pm25);
        result.put("min_pm25", min_pm25);
        result.put("ave_pm25", sum_pm25 / count);
        result.put("max_aqi", max_aqi);
        result.put("min_aqi", min_aqi);
        result.put("ave_aqi", sum_aqi / count);
        result.put("max_no2", max_no2);
        result.put("min_no2", min_no2);
        result.put("ave_no2", sum_no2 / count);
        result.put("max_pm10", max_pm10);
        result.put("min_pm10", min_pm10);
        result.put("ave_pm10", sum_pm10 / count);
        result.put("max_co", max_co);
        result.put("min_co", min_co);
        result.put("ave_co", sum_co / count);
        result.put("max_o3", max_o3);
        result.put("min_o3", min_o3);
        result.put("ave_o3", sum_o3 / count);
        result.put("max_so2", max_so2);
        result.put("min_so2", min_so2);
        result.put("ave_so2", sum_so2 / count);
        return result;
    }


    //FIXME

    /**
     * 根据日期、小时、站点代码返回趋势
     *
     * @param timeList，格式：2014-01-01
     * @param hourList，格式：01:00:00
     * @param station_code           站点代码
     * @return
     */
    @RequestMapping("hourTrends.do")
    public
    @ResponseBody
    String getHourTrendsByCodes(String[] timeList, String[] hourList, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pm");
        DBObject key = new BasicDBObject();
        key.put("station_code", true);
        key.put("position_name", true);
        key.put("time_point", true);
        key.put("pm2_5", true);

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;

        //空值判断
        if ((timeList == null || timeList.length == 0) && (hourList == null || hourList.length == 0) && (station_code == null || station_code.length == 0)) {
            //如果全部为空，则返回2014-01-01T00:00:00Z中所有时刻所有站点的值
            cond.put("time_point", "2014-01-01T00:00:00Z");
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else if (timeList != null && hourList == null && station_code == null) {
            //只有日期非空，返回该日期的所有数据
            int l = timeList.length;
            String[] timed = new String[24 * l];
            int k = 0;
            for (int i = 0; i < timeList.length; i++) {
                for (int j = 0; j < 24; j++) {
                    if (j < 10)
                        timed[k] = timeList[i].toString() + "T0" + j + ":00:00Z";
                    else
                        timed[k] = timeList[i].toString() + "T" + j + ":00:00Z";
                    k++;
                }
            }
            cond.put("time_point", new BasicDBObject("$in", timed));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else if (timeList == null && hourList != null && station_code == null) {
            //只有时刻非空，返回该时刻的所有数据(只返回前一个月的)
            String[] date = new String[31];
            for (int i = 0; i < hourList.length; i++) {
                for (int j = 1; j < 32; j++) {
                    if (j < 10)
                        date[j - 1] = "2014-01-0" + j + "T" + hourList[i].toString() + "Z";
                    else {
                        date[j - 1] = "2014-01-" + j + "T" + hourList[i].toString() + "Z";
                    }
                }
            }
            cond.put("time_point", new BasicDBObject("$in", date));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else if (timeList == null && hourList == null && station_code != null) {
            //只有站点非空，返回该站点的所有数据
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();

        } else if (timeList != null && hourList != null && station_code == null) {
            //只有站点为空，返回该站点在该时的所有数据
            int len_tL = timeList.length;
            int len_hL = hourList.length;
            int i = 0;
            String[] timeDetail = new String[len_tL * len_hL];

            for (int j = 0; j < len_tL; j++) {
                for (int k = 0; k < len_hL; k++) {
                    timeDetail[i] = timeList[j] + "T" + hourList[k] + "Z";   //当天和小时合成数据库中的time_point
                    i++;
                }
            }
            cond.put("time_point", new BasicDBObject("$in", timeDetail));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else if (timeList != null && hourList == null && station_code != null) {
            //只有时刻为空，返回站点在该日期的所有数据

            int l = timeList.length;
            String[] timed = new String[24 * l];
            int k = 0;
            for (int i = 0; i < timeList.length; i++) {
                for (int j = 0; j < 24; j++) {
                    if (j < 10)
                        timed[k] = timeList[i].toString() + "T0" + j + ":00:00Z";
                    else
                        timed[k] = timeList[i].toString() + "T" + j + ":00:00Z";
                    k++;
                }
            }
            cond.put("time_point", new BasicDBObject("$in", timed));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else if (timeList == null && hourList != null && station_code != null) {
            //只有日期为空
            String[] date = new String[31];
            for (int i = 0; i < hourList.length; i++) {
                for (int j = 1; j < 32; j++) {
                    if (j < 10)
                        date[j - 1] = "2014-01-0" + j + "T" + hourList[i].toString() + "Z";
                    else {
                        date[j - 1] = "2014-01-" + j + "T" + hourList[i].toString() + "Z";
                    }
                }
            }
            cond.put("time_point", new BasicDBObject("$in", date));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else {  //所有参数都不为空
            int len_tL = timeList.length;
            int len_hL = hourList.length;
            int i = 0;
            String[] timeDetail = new String[len_tL * len_hL];

            for (int j = 0; j < len_tL; j++) {
                for (int k = 0; k < len_hL; k++) {
                    timeDetail[i] = timeList[j] + "T" + hourList[k] + "Z";   //当天和小时合成数据库中的time_point
                    i++;
                }
            }
            cond.put("time_point", new BasicDBObject("$in", timeDetail));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        }
    }

//    db.pm.group({
//        'key':{'time_point':true},
//        'reduce':function(obj,out){out.csum += obj.pm2_5;out.ccount++;},
//        'initial':{'csum':0,'ccount':0},
//        'cond':{"second":{$gte:1388505600000,$lte:1388526600000},"station_code":{$in:['1490A','1491A']}},
//        'finalize':function(out){
//            out.avg_time=out.csum/out.ccount;
//        }
//    })

    /**
     * 根据日期、小时、站点代码返回趋势
     *
     * @param startTime，格式：2014-01-01 起始时间
     * @param endTime                 格式：同上 结束时间
     * @param station_code            站点代码
     *                                by yidu 使用second参数过滤
     *                                startTime 与endTime不可为空，station_code可为空，空返回全部的均值
     * @return
     */
    @RequestMapping("hourTrends2.do")
    public
    @ResponseBody
    String getHourTrendsByStationCodes(String startTime, String endTime,
                                       String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pm");

        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd");
        long start = 0L, end = 0L;
        try {
            start = df.parse(startTime).getTime();
            end = df.parse(endTime).getTime();
        } catch (Exception e) {
            e.printStackTrace();
        }
        DBObject key = new BasicDBObject();
//        key.put("station_code",true);
//        key.put("position_name",true);
        key.put("time_point", true);
//        key.put("pm2_5",true);

        String reduce = "function(obj,out){out.csum += obj.pm2_5;out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("csum", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){out.pm2_5=out.csum/out.ccount;}";
        DBObject cond = new BasicDBObject();
        DBObject result;

        if (station_code == null || station_code.length == 0) {
            DBObject gl = new BasicDBObject();
            gl.put("$gte", start);
            gl.put("$lt", end);
            cond.put("second", gl);
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else {
            DBObject gl = new BasicDBObject();
            gl.put("$gte", start);
            gl.put("$lte", end);
            cond.put("second", gl);
            DBObject in = new BasicDBObject();
            in.put("$in", station_code);
            cond.put("station_code", in);
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        }
    }

    /**
     * 根据日期、小时、站点代码返回趋势，包含全部检测项数据
     *
     * @param startTime，格式：2014-01-01 起始时间
     * @param endTime                 格式：同上 结束时间
     * @param station_code            站点代码
     *                                by yidu 使用second参数过滤
     *                                startTime 与endTime不可为空，station_code可为空，空返回全部的均值
     * @return
     */
    @RequestMapping("hourTrends3.do")
    public
    @ResponseBody
    String getHourTrendsByStationCodes2(String startTime, String endTime,
                                        String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pm");

        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd");
        long start = 0L, end = 0L;
        try {
            start = df.parse(startTime).getTime();
            end = df.parse(endTime).getTime();
        } catch (Exception e) {
            e.printStackTrace();
        }
        DBObject key = new BasicDBObject();
        key.put("time_point", true);

        String reduce = "function(obj,out){out.pm25+=obj.pm2_5;" +
                "out.aqi += obj.aqi;" +
                "out.no2 += obj.no2;" +
                "out.o3 += obj.o3;" +
                "out.pm10 += obj.pm10;" +
                "out.so2 += obj.so2;" +
                "out.co += obj.co;" +
                "out.ccount++;}";
        DBObject initial = new BasicDBObject();
        initial.put("pm25",0);
        initial.put("aqi", 0);
        initial.put("no2", 0);
        initial.put("o3", 0);
        initial.put("pm10", 0);
        initial.put("so2", 0);
        initial.put("co", 0);
        initial.put("ccount", 0);
        String finalize = "function(out){\n" +
                "out.pm25_ave=out.pm25/out.ccount;\n"+
                "out.aqi_ave=out.aqi/out.ccount;\n" +
                "out.no2_ave=out.no2/out.ccount;\n" +
                "out.o3_ave=out.o3/out.ccount;\n" +
                "out.pm10_ave=out.pm10/out.ccount;\n" +
                "out.so2_ave=out.so2/out.ccount;\n" +
                "out.co_ave=out.co/out.ccount;\n" +
                "}";
        DBObject cond = new BasicDBObject();
        DBObject result;

        if (station_code == null || station_code.length == 0) {
            DBObject gl = new BasicDBObject();
            gl.put("$gte", start);
            gl.put("$lt", end);
            cond.put("second", gl);
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        } else {
            DBObject gl = new BasicDBObject();
            gl.put("$gte", start);
            gl.put("$lte", end);
            cond.put("second", gl);
            DBObject in = new BasicDBObject();
            in.put("$in", station_code);
            cond.put("station_code", in);
            result = collection.group(key, cond, initial, reduce, finalize);
            return result.toString();
        }
    }


    /**
     * 根据日期、小时、站点代码返回站点数据的统计值(平均值，最大值和最小值)
     *
     * @param timeList，格式：2014-01-01
     * @param hourList，格式：01:00:00
     * @param station_code           站点代码
     * @return
     */
    @RequestMapping("Statistic_hourTrends.do")
    public
    @ResponseBody
    String getStatistic_HourTrendsByCodes(String[] timeList, String[] hourList, String[] station_code) {

        DBObject result = new BasicDBObject();

        //空值判断
        if ((timeList == null || timeList.length == 0) && (hourList == null || hourList.length == 0) && (station_code == null || station_code.length == 0)) {
            //如果全部为空，则返回2014-01-01T00:00:00Z中所有时刻所有站点的统计值

            return hourStatistic("2014-01-01T00:00:00Z", null).toString();
        } else if (timeList != null && hourList == null && station_code == null) {
            //只有日期非空，返回该日中每小时的统计值（每小时的平均值，最大值和最小值）
            int l = timeList.length;
            String[] timed = new String[24 * l];
            int k = 0;
            for (int i = 0; i < timeList.length; i++) {
                for (int j = 0; j < 24; j++) {
                    if (j < 10)
                        timed[k] = timeList[i].toString() + "T0" + j + ":00:00Z";
                    else
                        timed[k] = timeList[i].toString() + "T" + j + ":00:00Z";
                    result.put(timed[k], hourStatistic(timed[k], null));
                    k++;
                }
            }
            return result.toString();
        } else if (timeList == null && hourList != null && station_code == null) {
            //只有时刻非空，返回该时刻的所有数据(只返回前一个月的)
            String[] date = new String[31];
            for (int i = 0; i < hourList.length; i++) {
                for (int j = 1; j < 32; j++) {
                    if (j < 10)
                        date[j - 1] = "2014-01-0" + j + "T" + hourList[i].toString() + "Z";
                    else {
                        date[j - 1] = "2014-01-" + j + "T" + hourList[i].toString() + "Z";
                    }
                    result.put(date[j - 1], hourStatistic(date[j - 1], null));
                }
            }
            return result.toString();
        } else if (timeList == null && hourList == null && station_code != null) {
            //只有站点非空，返回该站点在时刻2014-01-01T00:00:00Z的数据

            return hourStatistic("2014-01-01T00:00:00Z", station_code).toString();

        } else if (timeList != null && hourList != null && station_code == null) {
            //只有站点为空，返回该站点在该时的所有数据
            int len_tL = timeList.length;
            int len_hL = hourList.length;
            int i = 0;
            String[] timeDetail = new String[len_tL * len_hL];

            for (int j = 0; j < len_tL; j++) {
                for (int k = 0; k < len_hL; k++) {
                    timeDetail[i] = timeList[j] + "T" + hourList[k] + "Z";   //当天和小时合成数据库中的time_point
                    result.put(timeDetail[i], hourStatistic(timeDetail[i], null));
                    i++;
                }
            }
            return result.toString();
        } else if (timeList != null && hourList == null && station_code != null) {
            //只有时刻为空，返回站点在该日期的所有数据

            int l = timeList.length;
            String[] timed = new String[24 * l];
            int k = 0;
            for (int i = 0; i < timeList.length; i++) {
                for (int j = 0; j < 24; j++) {
                    if (j < 10)
                        timed[k] = timeList[i].toString() + "T0" + j + ":00:00Z";
                    else
                        timed[k] = timeList[i].toString() + "T" + j + ":00:00Z";
                    result.put(timed[k], hourStatistic(timed[k], station_code));
                    k++;
                }
            }
            return result.toString();
        } else if (timeList == null && hourList != null && station_code != null) {
            //只有日期为空
            String[] date = new String[31];
            for (int i = 0; i < hourList.length; i++) {
                for (int j = 1; j < 32; j++) {
                    if (j < 10)
                        date[j - 1] = "2014-01-0" + j + "T" + hourList[i].toString() + "Z";
                    else {
                        date[j - 1] = "2014-01-" + j + "T" + hourList[i].toString() + "Z";
                    }
                    result.put(date[j - 1], hourStatistic(date[j - 1], station_code));
                }

            }
            return result.toString();
        } else {  //所有参数都不为空
            int len_tL = timeList.length;
            int len_hL = hourList.length;
            int i = 0;
            String[] timeDetail = new String[len_tL * len_hL];

            for (int j = 0; j < len_tL; j++) {
                for (int k = 0; k < len_hL; k++) {
                    timeDetail[i] = timeList[j] + "T" + hourList[k] + "Z";   //当天和小时合成数据库中的time_point
                    result.put(timeDetail[i], hourStatistic(timeDetail[i], station_code));
                    i++;
                }
            }
            return result.toString();

        }
    }


    /**
     * 返回按小时统计的信息
     *
     * @return
     */
    public DBObject hourStatistic(String time, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pm");
        DBObject cond = new BasicDBObject();
        DBObject result = new BasicDBObject();
        DBObject object = new BasicDBObject();
        DBObject maxresult = null;
        DBObject minresult = null;
        double max = 0;
        double min = 1000;
        double sumpm25 = 0;
        double pm25_ave = 0;
        int count = 0;
        DBCursor cursor;
        DBObject obj;
        //cond.put("time_point",time);
        if (station_code != null)
            cond.put("station_code", new BasicDBObject("$in", station_code));

        cond.put("time_point", time);
        cursor = collection.find(cond);
        max = 0;
        min = 1000;
        sumpm25 = 0;
        pm25_ave = 0;
        while (cursor.hasNext()) {
            obj = cursor.next();
            pm25_ave = Double.valueOf(obj.get("pm2_5").toString());
            if (pm25_ave > max) {
                max = pm25_ave;
                maxresult = obj;
            }
            if (pm25_ave < min) {
                min = pm25_ave;
                minresult = obj;
            }
            sumpm25 += pm25_ave;
            count++;
        }
        object.put("max", maxresult);
        object.put("min", minresult);
        object.put("ave", sumpm25 / count);

        return object;
    }


    /**
     * 根据日期、小时、站点代码返回站点数据的统计值，包含所有检测项(平均值，最大值和最小值)
     *
     * @param timeList，格式：2014-01-01
     * @param hourList，格式：01:00:00
     * @param station_code           站点代码
     *                               如果全部为空，则返回2014-01-01T00:00:00Z中所有时刻所有站点的统计值
     * @return
     */
    @RequestMapping("Statistic_hourTrends2.do")
    public
    @ResponseBody
    String getStatistic_HourTrendsByCodes2(String[] timeList, String[] hourList, String[] station_code) {

        DBObject result = new BasicDBObject();

        //空值判断
        if ((timeList == null || timeList.length == 0) && (hourList == null || hourList.length == 0) && (station_code == null || station_code.length == 0)) {
            //如果全部为空，则返回2014-01-01T00:00:00Z中所有时刻所有站点的统计值

            return hourStatistic2("2014-01-01T00:00:00Z", null).toString();
        } else if (timeList != null && hourList == null && station_code == null) {
            //只有日期非空，返回该日中每小时的统计值（每小时的平均值，最大值和最小值）
            int l = timeList.length;
            String[] timed = new String[24 * l];
            int k = 0;
            for (int i = 0; i < timeList.length; i++) {
                for (int j = 0; j < 24; j++) {
                    if (j < 10)
                        timed[k] = timeList[i].toString() + "T0" + j + ":00:00Z";
                    else
                        timed[k] = timeList[i].toString() + "T" + j + ":00:00Z";
                    result.put(timed[k], hourStatistic2(timed[k], null));
                    k++;
                }
            }
            return result.toString();
        } else if (timeList == null && hourList != null && station_code == null) {
            //只有时刻非空，返回该时刻的所有数据(只返回前一个月的)
            String[] date = new String[31];
            for (int i = 0; i < hourList.length; i++) {
                for (int j = 1; j < 32; j++) {
                    if (j < 10)
                        date[j - 1] = "2014-01-0" + j + "T" + hourList[i].toString() + "Z";
                    else {
                        date[j - 1] = "2014-01-" + j + "T" + hourList[i].toString() + "Z";
                    }
                    result.put(date[j - 1], hourStatistic2(date[j - 1], null));
                }
            }
            return result.toString();
        } else if (timeList == null && hourList == null && station_code != null) {
            //只有站点非空，返回该站点在时刻2014-01-01T00:00:00Z的数据

            return hourStatistic2("2014-01-01T00:00:00Z", station_code).toString();

        } else if (timeList != null && hourList != null && station_code == null) {
            //只有站点为空，返回该站点在该时的所有数据
            int len_tL = timeList.length;
            int len_hL = hourList.length;
            int i = 0;
            String[] timeDetail = new String[len_tL * len_hL];

            for (int j = 0; j < len_tL; j++) {
                for (int k = 0; k < len_hL; k++) {
                    timeDetail[i] = timeList[j] + "T" + hourList[k] + "Z";   //当天和小时合成数据库中的time_point
                    result.put(timeDetail[i], hourStatistic2(timeDetail[i], null));
                    i++;
                }
            }
            return result.toString();
        } else if (timeList != null && hourList == null && station_code != null) {
            //只有时刻为空，返回站点在该日期的所有数据

            int l = timeList.length;
            String[] timed = new String[24 * l];
            int k = 0;
            for (int i = 0; i < timeList.length; i++) {
                for (int j = 0; j < 24; j++) {
                    if (j < 10)
                        timed[k] = timeList[i].toString() + "T0" + j + ":00:00Z";
                    else
                        timed[k] = timeList[i].toString() + "T" + j + ":00:00Z";
                    result.put(timed[k], hourStatistic2(timed[k], station_code));
                    k++;
                }
            }
            return result.toString();
        } else if (timeList == null && hourList != null && station_code != null) {
            //只有日期为空
            String[] date = new String[31];
            for (int i = 0; i < hourList.length; i++) {
                for (int j = 1; j < 32; j++) {
                    if (j < 10)
                        date[j - 1] = "2014-01-0" + j + "T" + hourList[i].toString() + "Z";
                    else {
                        date[j - 1] = "2014-01-" + j + "T" + hourList[i].toString() + "Z";
                    }
                    result.put(date[j - 1], hourStatistic2(date[j - 1], station_code));
                }

            }
            return result.toString();
        } else {  //所有参数都不为空
            int len_tL = timeList.length;
            int len_hL = hourList.length;
            int i = 0;
            String[] timeDetail = new String[len_tL * len_hL];

            for (int j = 0; j < len_tL; j++) {
                for (int k = 0; k < len_hL; k++) {
                    timeDetail[i] = timeList[j] + "T" + hourList[k] + "Z";   //当天和小时合成数据库中的time_point
                    result.put(timeDetail[i], hourStatistic2(timeDetail[i], station_code));
                    i++;
                }
            }
            return result.toString();

        }
    }


    /**
     * 返回按小时统计的信息
     *
     * @return
     */
    public DBObject hourStatistic2(String time, String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pm");
        DBObject cond = new BasicDBObject();
        DBObject result = new BasicDBObject();
        int count = 0;
        DBCursor cursor;
        DBObject obj;
        if (station_code != null)
            cond.put("station_code", new BasicDBObject("$in", station_code));

        cond.put("time_point", time);
        cursor = collection.find(cond);
        double max_pm25=0,max_aqi = 0, max_no2 = 0, max_pm10 = 0, max_co = 0, max_o3 = 0, max_so2 = 0;
        double min_pm25 = 1000,min_aqi = 1000, min_no2 = 1000, min_pm10 = 1000, min_co = 1000, min_o3 = 1000, min_so2 = 1000;
        double sum_pm25=0,sum_aqi = 0, sum_no2 = 0, sum_pm10 = 0, sum_co = 0, sum_o3 = 0, sum_so2 = 0;
        double pm25_ave=0,aqi_ave = 0, no2_ave = 0, pm10_ave = 0, co_ave = 0, o3_ave = 0, so2_ave = 0;
        while (cursor.hasNext()) {
            obj = cursor.next();
            pm25_ave = Double.valueOf(obj.get("pm2_5").toString());
            aqi_ave = Double.valueOf(obj.get("aqi").toString());
            no2_ave = Double.valueOf(obj.get("no2").toString());
            pm10_ave = Double.valueOf(obj.get("pm10").toString());
            co_ave = Double.valueOf(obj.get("co").toString());
            o3_ave = Double.valueOf(obj.get("o3").toString());
            so2_ave = Double.valueOf(obj.get("so2").toString());
            if (pm25_ave > max_pm25)
                max_pm25 = pm25_ave;
            else if (pm25_ave < min_pm25)
                min_pm25 = pm25_ave;

            if (aqi_ave > max_aqi)
                max_aqi = aqi_ave;
            else if (aqi_ave < min_aqi)
                min_aqi = aqi_ave;

            if (no2_ave > max_no2)
                max_no2 = no2_ave;
            else if (no2_ave < min_no2)
                min_no2 = no2_ave;

            if (pm10_ave > max_pm10)
                max_pm10 = pm10_ave;
            else if (pm10_ave < min_pm10)
                min_pm10 = pm10_ave;

            if (co_ave > max_co)
                max_co = co_ave;
            else if (co_ave < min_co)
                min_co = co_ave;

            if (o3_ave > max_o3)
                max_o3 = o3_ave;
            else if (o3_ave < min_o3)
                min_o3 = o3_ave;

            if (so2_ave > max_so2)
                max_so2 = so2_ave;
            else if (so2_ave < min_so2)
                min_so2 = so2_ave;

            sum_pm25+=pm25_ave;
            sum_aqi += aqi_ave;
            sum_no2 += no2_ave;
            sum_pm10 += pm10_ave;
            sum_co += co_ave;
            sum_o3 += o3_ave;
            sum_so2 += so2_ave;
            count++;
        }
        result.put("max_pm25", max_pm25);
        result.put("min_pm25", min_pm25);
        result.put("ave_pm25", sum_pm25 / count);
        result.put("max_aqi", max_aqi);
        result.put("min_aqi", min_aqi);
        result.put("ave_aqi", sum_aqi / count);
        result.put("max_no2", max_no2);
        result.put("min_no2", min_no2);
        result.put("ave_no2", sum_no2 / count);
        result.put("max_pm10", max_pm10);
        result.put("min_pm10", min_pm10);
        result.put("ave_pm10", sum_pm10/ count);
        result.put("max_co", max_co);
        result.put("min_co", min_co);
        result.put("ave_co", sum_co / count);
        result.put("max_o3", max_o3);
        result.put("min_o3", min_o3);
        result.put("ave_o3", sum_o3 / count);
        result.put("max_so2", max_so2);
        result.put("min_so2", min_so2);
        result.put("ave_so2", sum_so2 / count);
        return result;

    }


    /**
     * @param weekNum     当年第几周  例： 1或20
     * @param isWeekend   是否为周末 例： 1-周末  0-工作日
     * @param timeList    必填参数  例：  年：2014  月2014-01   日：2014-01-01
     * @param areaList    城市名称 例：  北京
     * @param stationList 站点名称 例：1024A
     * @param airList     mongo数据库里字段名称  例：no2_min 或 co_max
     * @return
     */
    @RequestMapping("week.do")
    public
    @ResponseBody
    String getWeek(Integer weekNum, Integer isWeekend, String[] timeList, String[] areaList, String[] stationList, String[] airList) {
        JSONArray result = new JSONArray();
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection day = db.getCollection("pmdata_day");
        DBObject ref = new BasicDBObject();
        DBObject key = new BasicDBObject();
        if (weekNum != null) {
            ref.put("weekNum", weekNum);
        }
        if (isWeekend != null) {
            ref.put("weekNum", isWeekend);
        }
        if (timeList != null) {
            BasicDBList values = new BasicDBList();
            for (String time : timeList) {
                values.add(time);
            }
            ref.put("time_point", new BasicDBObject("$in", values));
        }
        if (areaList != null) {
            BasicDBList values = new BasicDBList();
            //向values添加城市列表
            for (String area : areaList) {
                values.add(area);
            }
            ref.put("area", new BasicDBObject("$in", values));
        }
        if (stationList != null) {
            BasicDBList values = new BasicDBList();
            for (String position : stationList) {
                values.add(position);
            }
            ref.put("station_code", new BasicDBObject("$in", values));
        }
        if (airList != null) {
            for (String air : airList) {
                key.put(air, 1);
            }
        }
        key.put("time_point", 1);
        key.put("longitude", 1);
        key.put("latitude", 1);
        key.put("position_name", 1);
        key.put("area", 1);
        key.put("pm25_ave", 1);
        DBCursor cursor = null;

        cursor = day.find(ref, key);
        JSONObject oneResult;
        DBObject oneObj;
        double max = 0;
        while (cursor.hasNext()) {
            oneResult = new JSONObject();
            oneObj = cursor.next();
            //判断是否所有键都存在
            if (oneObj.get("longitude") == null || oneObj.get("latitude") == null ||
                    oneObj.get("position_name") == null || oneObj.get("pm25_ave") == null)
                continue;
            //keySet方法获取map所有的K值
            Set<String> i = oneObj.keySet();
            for (String k : i) {
                try {
                    oneResult.put(k, oneObj.get(k));
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            if (max < Double.parseDouble(oneObj.get("pm25_ave").toString()))
                max = Double.parseDouble(oneObj.get("pm25_ave").toString());
            result.put(oneResult);
        }
        JSONObject parsedResult = new JSONObject();

        try {
            parsedResult.put("max", max);
            parsedResult.put("data", result);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return parsedResult.toString();
    }


    //TODO

    /**
     * 返回周末数据
     *
     * @param station_code 站点代码
     */
    @RequestMapping("IsWeekendTrends.do")
    public
    @ResponseBody
    String getIsWeekendTrends(String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave", true);

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        //空值判断
        if (station_code == null)  //如果站点为空，则返回所有站点在第一个周末的数据
        {
            cond.put("isWeekend", 1);
            cond.put("weekNum", 1);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("isWeekend", 1);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    //TODO

    /**
     * 返回周末数据，包含全部检测项数据
     *
     * @param station_code 站点代码
     */
    @RequestMapping("IsWeekendTrends2.do")
    public
    @ResponseBody
    String getIsWeekendTrends2(String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave",1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);
        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        //空值判断
        if (station_code == null)  //如果站点为空，则返回所有站点在第一个周末的数据
        {
            cond.put("isWeekend", 1);
            cond.put("weekNum", 1);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("isWeekend", 1);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }



    /**
     * 返回周末统计数据，2014年共有52周零1天，2014-01-01为周三，故有52个周末
     * @param station_code 站点代码
     */
    @RequestMapping("Statistic_IsWeekendTrends.do")
    public @ResponseBody String getStatistic_IsWeekendTrends(String[] station_code)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        }catch(Exception e){
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key=new BasicDBObject();
        key.put("time_point",true);
        key.put("station_code",true);
        key.put("pm25_ave",true);
        DBObject cond = new BasicDBObject();
        DBCursor cursor;
        DBObject result = new BasicDBObject();
        //空值判断
        if(station_code==null)  //如果站点为空，则返回所有站点在所有周末的数据
        {
            cond.put("isWeekend",1);
            //cond.put("weekNum",1);
        }
        else
        {
            cond.put("isWeekend",1);
            cond.put("station_code",new BasicDBObject("$in",station_code));
        }
        for(int i=1;i<=52;i++)
        {
            cond.put("weekNum",i);
            cursor=collection.find(cond,key);
            double max=0;
            double min=1000;
            double sumpm25=0;
            double pm25_ave=0;
            int count=0;
            DBObject obj;
            DBObject object=new BasicDBObject();
            DBObject maxresult=null;
            DBObject minresult=null;

            while(cursor.hasNext())
            {
                obj=cursor.next();
                pm25_ave=Double.valueOf(obj.get("pm25_ave").toString());
                if(pm25_ave>max) {
                    max=pm25_ave;
                    maxresult=obj;
                }
                if(pm25_ave<min) {
                    min=pm25_ave;
                    minresult=obj;
                }
                sumpm25+=pm25_ave;
                count++;
            }
            object.put("max", maxresult);
            object.put("min", minresult);
            object.put("ave", sumpm25 / count);
            result.put("weekNum:"+i,object);
        }

        return result.toString();
    }


    /**
     * 返回周末统计数据，包含全部检测项数据
     * 2014年共有52周零1天，2014-01-01为周三，故有52个周末
     *
     * @param station_code 站点代码
     */
    @RequestMapping("Statistic_IsWeekendTrends2.do")
    public @ResponseBody String getStatistic_IsWeekendTrends2(String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject cond = new BasicDBObject();
        DBCursor cursor;
        DBObject coresult=new BasicDBObject();
        int count=0;
        DBObject obj;
        //空值判断
        cond.put("isWeekend", 1);
        if(station_code!=null)
            cond.put("station_code", new BasicDBObject("$in", station_code));
        for (int i = 1; i <= 52; i++) {
            DBObject result = new BasicDBObject();
            cond.put("weekNum", i);
            cursor = collection.find(cond);
            double max_pm25=0,max_aqi = 0, max_no2 = 0, max_pm10 = 0, max_co = 0, max_o3 = 0, max_so2 = 0;
            double min_pm25=1000,min_aqi = 1000, min_no2 = 1000, min_pm10 = 1000, min_co = 1000, min_o3 = 1000, min_so2 = 1000;
            double sum_pm25=0,sum_aqi = 0, sum_no2 = 0, sum_pm10 = 0, sum_co = 0, sum_o3 = 0, sum_so2 = 0;
            double pm25_ave,aqi_ave, no2_ave, pm10_ave, co_ave , o3_ave, so2_ave;
            while (cursor.hasNext()) {
                obj = cursor.next();
                pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
                aqi_ave = Double.valueOf(obj.get("aqi_ave").toString());
                no2_ave = Double.valueOf(obj.get("no2_ave").toString());
                pm10_ave = Double.valueOf(obj.get("pm10_ave").toString());
                co_ave = Double.valueOf(obj.get("co_ave").toString());
                o3_ave = Double.valueOf(obj.get("o3_ave").toString());
                so2_ave = Double.valueOf(obj.get("so2_ave").toString());
                if (pm25_ave > max_pm25)
                    max_pm25 = pm25_ave;
                else if (pm25_ave < min_pm25)
                    min_pm25 = pm25_ave;

                if (aqi_ave > max_aqi)
                    max_aqi = aqi_ave;
                else if (aqi_ave < min_aqi)
                    min_aqi = aqi_ave;

                if (no2_ave > max_no2)
                    max_no2 = no2_ave;
                else if (no2_ave < min_no2)
                    min_no2 = no2_ave;

                if (pm10_ave > max_pm10)
                    max_pm10 = pm10_ave;
                else if (pm10_ave < min_pm10)
                    min_pm10 = pm10_ave;

                if (co_ave > max_co)
                    max_co = co_ave;
                else if (co_ave < min_co)
                    min_co = co_ave;

                if (o3_ave > max_o3)
                    max_o3 = o3_ave;
                else if (o3_ave < min_o3)
                    min_o3 = o3_ave;

                if (so2_ave > max_so2)
                    max_so2 = so2_ave;
                else if (so2_ave < min_so2)
                    min_so2 = so2_ave;

                sum_pm25+=pm25_ave;
                sum_aqi += aqi_ave;
                sum_no2 += no2_ave;
                sum_pm10 += pm10_ave;
                sum_co += co_ave;
                sum_o3 += o3_ave;
                sum_so2 += so2_ave;
                count++;
            }
            result.put("max_pm25", max_pm25);
            result.put("min_pm25", min_pm25);
            result.put("ave_pm25", sum_pm25 / count);
            result.put("max_aqi", max_aqi);
            result.put("min_aqi", min_aqi);
            result.put("ave_aqi", sum_aqi / count);
            result.put("max_no2", max_no2);
            result.put("min_no2", min_no2);
            result.put("ave_no2", sum_no2 / count);
            result.put("max_pm10", max_pm10);
            result.put("min_pm10", min_pm10);
            result.put("ave_pm10", sum_pm10 / count);
            result.put("max_co", max_co);
            result.put("min_co", min_co);
            result.put("ave_co", sum_co / count);
            result.put("max_o3", max_o3);
            result.put("min_o3", min_o3);
            result.put("ave_o3", sum_o3 / count);
            result.put("max_so2", max_so2);
            result.put("min_so2", min_so2);
            result.put("ave_so2", sum_so2 / count);
            coresult.put("WeekNum:"+i,result);
        }
        return coresult.toString();
    }


    //TODO
    /**
     * 根据站点代码返回非周末数据
     * @param station_code 站点代码
     */
    @RequestMapping("NotWeekendTrends.do")
    public @ResponseBody String getNotWeekendTrends (String[]station_code)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave", true);

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        //空值判断
        if (station_code == null)  //如果站点为空，则返回所有站点在第一周非周末的所有数据
        {
            cond.put("isWeekend", 0);
            cond.put("weekNum", 1);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("isWeekend", 0);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    //TODO
    /**
     * 根据站点代码返回非周末数据，包含全部检测项的数据
     * @param station_code 站点代码
     */
    @RequestMapping("NotWeekendTrends2.do")
    public @ResponseBody String getNotWeekendTrends2 (String[]station_code)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave",1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        //空值判断
        if (station_code == null)  //如果站点为空，则返回所有站点在第一周非周末的所有数据
        {
            cond.put("isWeekend", 0);
            cond.put("weekNum", 1);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("isWeekend", 0);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    /**
     * 返回站点在每一周中非周末时间的统计数据，2014年共有52周零1天，2014-01-01为周三，故有52个周末
     * @param station_code 站点代码
     */
    @RequestMapping("Statistic_NotWeekendTrends.do")
    public @ResponseBody String getStatistic_NotWeekendTrends (String[]station_code)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave", true);

        DBObject cond = new BasicDBObject();
        DBCursor cursor;
        DBObject result = new BasicDBObject();
        //空值判断
        if (station_code == null)  //如果站点为空，则返回所有站点在所有周的非周末的统计数据
        {
            cond.put("isWeekend", 0);
        } else {
            cond.put("isWeekend", 0);
            cond.put("station_code", new BasicDBObject("$in", station_code));
        }
        for (int i = 1; i <= 52; i++) {
            cond.put("weekNum", i);
            cursor = collection.find(cond);
            double max = 0;
            double min = 1000;
            double sumpm25 = 0;
            double pm25_ave = 0;
            int count = 0;
            DBObject obj;
            DBObject object = new BasicDBObject();
            DBObject maxresult = null;
            DBObject minresult = null;

            while (cursor.hasNext()) {
                obj = cursor.next();
                pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
                if (pm25_ave > max) {
                    max = pm25_ave;
                    maxresult = obj;
                }
                if (pm25_ave < min) {
                    min = pm25_ave;
                    minresult = obj;
                }
                sumpm25 += pm25_ave;
                count++;
            }
            object.put("max", maxresult);
            object.put("min", minresult);
            object.put("ave", sumpm25 / count);
            result.put("weekNum:" + i, object);
        }
        return result.toString();
    }


    /**
     * 返回非周末统计数据，包含全部检测项数据
     * 2014年共有52周零1天，2014-01-01为周三，故有52个周末
     *
     * @param station_code 站点代码
     */
    @RequestMapping("Statistic_NotWeekendTrends2.do")
    public @ResponseBody String getStatistic_NotWeekendTrends2(String[] station_code) {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject cond = new BasicDBObject();
        DBCursor cursor;
        DBObject coresult=new BasicDBObject();
        int count=0;
        DBObject obj;
        //空值判断
        if (station_code == null)  //如果站点为空，则返回所有站点在所有周末的数据
        {
            cond.put("isWeekend", 0);
        } else {
            cond.put("isWeekend", 0);
            cond.put("station_code", new BasicDBObject("$in", station_code));
        }
        for (int i = 1; i <= 52; i++) {
            DBObject result = new BasicDBObject();
            cond.put("weekNum", i);
            cursor = collection.find(cond);
            double max_pm25=0,max_aqi = 0, max_no2 = 0, max_pm10 = 0, max_co = 0, max_o3 = 0, max_so2 = 0;
            double min_pm25=1000,min_aqi = 1000, min_no2 = 1000, min_pm10 = 1000, min_co = 1000, min_o3 = 1000, min_so2 = 1000;
            double sum_pm25=0,sum_aqi = 0, sum_no2 = 0, sum_pm10 = 0, sum_co = 0, sum_o3 = 0, sum_so2 = 0;
            double pm25_ave=0,aqi_ave = 0, no2_ave = 0, pm10_ave = 0, co_ave = 0, o3_ave = 0, so2_ave = 0;
            while (cursor.hasNext()) {
                obj = cursor.next();
                pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
                aqi_ave = Double.valueOf(obj.get("aqi_ave").toString());
                no2_ave = Double.valueOf(obj.get("no2_ave").toString());
                pm10_ave = Double.valueOf(obj.get("pm10_ave").toString());
                co_ave = Double.valueOf(obj.get("co_ave").toString());
                o3_ave = Double.valueOf(obj.get("o3_ave").toString());
                so2_ave = Double.valueOf(obj.get("so2_ave").toString());
                if (pm25_ave > max_pm25)
                    max_pm25 = pm25_ave;
                else if (pm25_ave < min_pm25)
                    min_pm25 = pm25_ave;

                if (aqi_ave > max_aqi)
                    max_aqi = aqi_ave;
                else if (aqi_ave < min_aqi)
                    min_aqi = aqi_ave;

                if (no2_ave > max_no2)
                    max_no2 = no2_ave;
                else if (no2_ave < min_no2)
                    min_no2 = no2_ave;

                if (pm10_ave > max_pm10)
                    max_pm10 = pm10_ave;
                else if (pm10_ave < min_pm10)
                    min_pm10 = pm10_ave;

                if (co_ave > max_co)
                    max_co = co_ave;
                else if (co_ave < min_co)
                    min_co = co_ave;

                if (o3_ave > max_o3)
                    max_o3 = o3_ave;
                else if (o3_ave < min_o3)
                    min_o3 = o3_ave;

                if (so2_ave > max_so2)
                    max_so2 = so2_ave;
                else if (so2_ave < min_so2)
                    min_so2 = so2_ave;

                sum_pm25+=pm25_ave;
                sum_aqi += aqi_ave;
                sum_no2 += no2_ave;
                sum_pm10 += pm10_ave;
                sum_co += co_ave;
                sum_o3 += o3_ave;
                sum_so2 += so2_ave;
                count++;
            }
            result.put("max_pm25", max_pm25);
            result.put("min_pm25", min_pm25);
            result.put("ave_pm25", sum_pm25 / count);
            result.put("max_aqi", max_aqi);
            result.put("min_aqi", min_aqi);
            result.put("ave_aqi", sum_aqi / count);
            result.put("max_no2", max_no2);
            result.put("min_no2", min_no2);
            result.put("ave_no2", sum_no2 / count);
            result.put("max_pm10", max_pm10);
            result.put("min_pm10", min_pm10);
            result.put("ave_pm10", sum_pm10 / count);
            result.put("max_co", max_co);
            result.put("min_co", min_co);
            result.put("ave_co", sum_co / count);
            result.put("max_o3", max_o3);
            result.put("min_o3", min_o3);
            result.put("ave_o3", sum_o3 / count);
            result.put("max_so2", max_so2);
            result.put("min_so2", min_so2);
            result.put("ave_so2", sum_so2 / count);
            coresult.put("WeekNum:"+i,result);
        }
        return coresult.toString();
    }



    //TODO
    /**
     * 返回一周中某天的数据
     * @param station_code 站点代码
     * @param num 代表星期几1,2,3,4,5,6,7
     */
    @RequestMapping("DayOfWeekTrends.do")
    public @ResponseBody String getDayOfWeekTrends (String[]station_code, Integer num)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave", true);

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        List<String> days = null;//
        //空值判断
        if (station_code == null && num == null)  //如果都为空，则返回所有站点在第一个周末的数据
        {
            cond.put("isWeekend", 1);
            cond.put("weekNum", 1);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (station_code != null && num == null)  //如果只有站点为非空,返回该站点的所有数据
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (station_code == null && num != null)//如果只有num非空,返回规定时间中的所有站点的数据
        {
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else //如果全部为非空
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    //TODO
    /**
     * 返回一周中某天的数据，包含其他检测项的数据
     * @param station_code 站点代码
     * @param num 代表星期几1,2,3,4,5,6,7
     */
    @RequestMapping("DayOfWeekTrends2.do")
    public @ResponseBody String getDayOfWeekTrends2 (String[]station_code, Integer num)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave",1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);

        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result;
        List<String> days = null;//
        //空值判断
        if (station_code == null && num == null)  //如果都为空，则返回所有站点在第一个周末的数据
        {
            cond.put("isWeekend", 1);
            cond.put("weekNum", 1);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (station_code != null && num == null)  //如果只有站点为非空,返回该站点的所有数据
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (station_code == null && num != null)//如果只有num非空,返回规定时间中的所有站点的数据
        {
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else //如果全部为非空
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));
            result = collection.group(key, cond, initial, reduce, finalize);
        }

        return result.toString();
    }


    /**
     * 返回一周中某天的站点的统计数据
     * @param station_code 站点代码
     * @param num 代表星期几1,2,3,4,5,6,7
     */
    @RequestMapping("Statistic_DayOfWeekTrends.do")
    public @ResponseBody String getS_dayOfWeekTrends (String[]station_code, Integer num)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        key.put("time_point", true);
        key.put("station_code", true);
        key.put("pm25_ave", true);
        DBCursor cursor;
        DBObject cond = new BasicDBObject();
        DBObject result = new BasicDBObject();
        List<String> days = null;//
        //空值判断
        if (station_code == null && num == null)  //如果都为空，则返回所有站点在周末的统计数据
        {
            cond.put("isWeekend", 1);
            //cond.put("weekNum",1);
        } else if (station_code != null && num == null)  //如果只有站点为非空,返回该站点的所有数据
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));

        } else if (station_code == null && num != null)//如果只有num非空,返回规定时间中的所有站点的数据
        {
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));

        } else //如果全部为非空
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));

        }
        for (int i = 1; i <= 52; i++) {
            cond.put("weekNum", i);
            cursor = collection.find(cond);
            double max = 0;
            double min = 1000;
            double sumpm25 = 0;
            double pm25_ave = 0;
            int count = 0;
            DBObject obj;
            DBObject object = new BasicDBObject();
            DBObject maxresult = null;
            DBObject minresult = null;

            while (cursor.hasNext()) {
                obj = cursor.next();
                pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
                if (pm25_ave > max) {
                    max = pm25_ave;
                    maxresult = obj;
                }
                if (pm25_ave < min) {
                    min = pm25_ave;
                    minresult = obj;
                }
                sumpm25 += pm25_ave;
                count++;
            }
            object.put("max", maxresult);
            object.put("min", minresult);
            object.put("ave", sumpm25 / count);
            result.put("weekNum:" + i + " 星期:" + num, object);

        }
        return result.toString();
    }




    /**
     * 返回一周中某天的站点的统计数据，包含除pm2.5以外的其他检测项数据
     * @param station_code 站点代码
     * @param num 代表星期几1,2,3,4,5,6,7
     *            如果都为空，则返回所有站点在周末的统计数据
     */
    @RequestMapping("Statistic_DayOfWeekTrends2.do")
    public @ResponseBody String getS_dayOfWeekTrends2 (String[]station_code, Integer num)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject coresult=new BasicDBObject();
        DBCursor cursor;
        DBObject cond = new BasicDBObject();
        List<String> days = null;//
        int count=0;
        DBObject obj;
        //空值判断
        if (station_code == null && num == null)  //如果都为空，则返回所有站点在周末的统计数据
        {
            cond.put("isWeekend", 1);
        } else if (station_code != null && num == null)  //如果只有站点为非空,返回该站点的所有数据
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));

        } else if (station_code == null && num != null)//如果只有num非空,返回规定时间中的所有站点的数据
        {
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));

        } else //如果全部为非空
        {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            days = getDayOfWeek(num);
            cond.put("time_point", new BasicDBObject("$in", days));

        }
        for (int i = 1; i <= 52; i++) {
            cond.put("weekNum", i);
            cursor = collection.find(cond);
            DBObject result = new BasicDBObject();
            double max_pm25=0,max_aqi = 0, max_no2 = 0, max_pm10 = 0, max_co = 0, max_o3 = 0, max_so2 = 0;
            double min_pm25=1000,min_aqi = 1000, min_no2 = 1000, min_pm10 = 1000, min_co = 1000, min_o3 = 1000, min_so2 = 1000;
            double sum_pm25=0,sum_aqi = 0, sum_no2 = 0, sum_pm10 = 0, sum_co = 0, sum_o3 = 0, sum_so2 = 0;
            double pm25_ave=0,aqi_ave = 0, no2_ave = 0, pm10_ave = 0, co_ave = 0, o3_ave = 0, so2_ave = 0;
            while (cursor.hasNext()) {
                obj = cursor.next();
                pm25_ave = Double.valueOf(obj.get("pm25_ave").toString());
                aqi_ave = Double.valueOf(obj.get("aqi_ave").toString());
                no2_ave = Double.valueOf(obj.get("no2_ave").toString());
                pm10_ave = Double.valueOf(obj.get("pm10_ave").toString());
                co_ave = Double.valueOf(obj.get("co_ave").toString());
                o3_ave = Double.valueOf(obj.get("o3_ave").toString());
                so2_ave = Double.valueOf(obj.get("so2_ave").toString());
                if (pm25_ave > max_pm25)
                    max_pm25 = pm25_ave;
                else if (pm25_ave < min_pm25)
                    min_pm25 = pm25_ave;

                if (aqi_ave > max_aqi)
                    max_aqi = aqi_ave;
                else if (aqi_ave < min_aqi)
                    min_aqi = aqi_ave;

                if (no2_ave > max_no2)
                    max_no2 = no2_ave;
                else if (no2_ave < min_no2)
                    min_no2 = no2_ave;

                if (pm10_ave > max_pm10)
                    max_pm10 = pm10_ave;
                else if (pm10_ave < min_pm10)
                    min_pm10 = pm10_ave;

                if (co_ave > max_co)
                    max_co = co_ave;
                else if (co_ave < min_co)
                    min_co = co_ave;

                if (o3_ave > max_o3)
                    max_o3 = o3_ave;
                else if (o3_ave < min_o3)
                    min_o3 = o3_ave;

                if (so2_ave > max_so2)
                    max_so2 = so2_ave;
                else if (so2_ave < min_so2)
                    min_so2 = so2_ave;

                sum_pm25+=pm25_ave;
                sum_aqi += aqi_ave;
                sum_no2 += no2_ave;
                sum_pm10 += pm10_ave;
                sum_co += co_ave;
                sum_o3 += o3_ave;
                sum_so2 += so2_ave;
                count++;
            }
            result.put("max_pm25", max_pm25);
            result.put("min_pm25", min_pm25);
            result.put("ave_pm25", sum_pm25 / count);
            result.put("max_aqi", max_aqi);
            result.put("min_aqi", min_aqi);
            result.put("ave_aqi", sum_aqi / count);
            result.put("max_no2", max_no2);
            result.put("min_no2", min_no2);
            result.put("ave_no2", sum_no2 / count);
            result.put("max_pm10", max_pm10);
            result.put("min_pm10", min_pm10);
            result.put("ave_pm10", sum_pm10 / count);
            result.put("max_co", max_co);
            result.put("min_co", min_co);
            result.put("ave_co", sum_co / count);
            result.put("max_o3", max_o3);
            result.put("min_o3", min_o3);
            result.put("ave_o3", sum_o3 / count);
            result.put("max_so2", max_so2);
            result.put("min_so2", min_so2);
            result.put("ave_so2", sum_so2 / count);
            coresult.put("WeekNum:"+i,result);
        }
        return coresult.toString();
    }



    /**
     * 返回一年中的所有星期中某一天的日期
     * @param num 星期几
     */
    public List<String> getDayOfWeek ( int num)
    {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd");
        List<String> days = new LinkedList<String>();
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.YEAR, 2014);
        calendar.set(Calendar.MONTH, Calendar.JANUARY);
        calendar.set(Calendar.WEEK_OF_YEAR, 1);
        calendar.set(Calendar.WEEK_OF_MONTH, 1);
        if (num == 1) calendar.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY); // 第一个周一
        else if (num == 2) calendar.set(Calendar.DAY_OF_WEEK, Calendar.TUESDAY); // 第一个周二
        else if (num == 3) calendar.set(Calendar.DAY_OF_WEEK, Calendar.WEDNESDAY); // 第一个周三
        else if (num == 4) calendar.set(Calendar.DAY_OF_WEEK, Calendar.THURSDAY); // 第一个周四
        else if (num == 5) calendar.set(Calendar.DAY_OF_WEEK, Calendar.FRIDAY); // 第一个周五
        else if (num == 6) calendar.set(Calendar.DAY_OF_WEEK, Calendar.SATURDAY); // 第一个周六
        else calendar.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY); // 第一个周日

        Calendar cstart = Calendar.getInstance();
        Calendar cend = Calendar.getInstance();
        cstart.set(2013, 11, 31); //2013-12-31
        cend.set(2015, 0, 1);//2015-1-1

        Calendar d = (Calendar) calendar.clone();
        // 向后
        for (int i = 0; d.before(cend); i++, d.add(Calendar.DAY_OF_YEAR, 7)) {
            //days.add("2014-"+(1+d.get(Calendar.MONTH))+"-"+d.get(Calendar.DATE));
            if ((i == 0) && ((num == 1) || (num == 2) || (num == 7)))
                continue;
            days.add(format.format(d.getTime()));
        }

        return days;
    }


    //TODO
    /**
     * 根据某个时间段(天)返回数据
     * @param beginDay 开始日期，例如：2014-01-01
     * @param endDay  结束日期,例如：2014-02-03
     * @param station_code 站点代码
     */
    @RequestMapping("DayPeriodTrends.do")
    public @ResponseBody String getDayPeriodTrends (String beginDay, String endDay, String[]station_code)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result = null;
        List<String> timeList = new LinkedList<String>();
        key.put("station_code", true);
        key.put("position_name", true);
        key.put("area", true);
        key.put("time_point", true);
        key.put("pm25_ave", true);

        //空值判断
        if (beginDay == null && endDay == null && station_code == null)  //返回2014-01-01的所有站点的值
        {
            cond.put("time_point", "2014-01-01");
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay != null && endDay == null && station_code == null)  //返回beginDay的所有站点的值
        {
            cond.put("time_point", beginDay);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay == null && endDay != null && station_code == null) {
            cond.put("time_point", endDay);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay == null && endDay == null && station_code != null) {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay != null && endDay != null && station_code == null) {
            cond.put("time_point", new BasicDBObject("$in", getDays(beginDay, endDay)));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay != null && endDay == null && station_code != null) {
            cond.put("time_point", beginDay);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay == null && endDay != null && station_code != null) {
            cond.put("time_point", endDay);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("time_point", new BasicDBObject("$in", getDays(beginDay, endDay)));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }
        return result.toString();
    }


    //TODO
    /**
     * 根据某个时间段(天)返回数据，包含全部检测项的数据
     * @param beginDay 开始日期，例如：2014-01-01
     * @param endDay  结束日期,例如：2014-02-03
     * @param station_code 站点代码
     */
    @RequestMapping("DayPeriodTrends2.do")
    public @ResponseBody String getDayPeriodTrends2 (String beginDay, String endDay, String[]station_code)
    {
        MongoClient mongo = null;
        try {
            mongo = new MongoClient(SERVER_IP);
        } catch (Exception e) {
            e.printStackTrace();
        }
        DB db = mongo.getDB("pmdata_2014");
        DBCollection collection = db.getCollection("pmdata_day");
        DBObject key = new BasicDBObject();
        String reduce = "function(obj,out){}";
        DBObject initial = new BasicDBObject();
        String finalize = "function(out){}";
        DBObject cond = new BasicDBObject();
        DBObject result = null;
        List<String> timeList = new LinkedList<String>();
        key.put("station_code", true);
        key.put("time_point", true);
        key.put("pm25_ave",1);
        key.put("aqi_ave", 1);
        key.put("no2_ave", 1);
        key.put("pm10_ave", 1);
        key.put("co_ave", 1);
        key.put("o3_ave", 1);
        key.put("so2_ave", 1);

        //空值判断
        if (beginDay == null && endDay == null && station_code == null)  //返回2014-01-01的所有站点的值
        {
            cond.put("time_point", "2014-01-01");
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay != null && endDay == null && station_code == null)  //返回beginDay的所有站点的值
        {
            cond.put("time_point", beginDay);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay == null && endDay != null && station_code == null) {
            cond.put("time_point", endDay);
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay == null && endDay == null && station_code != null) {
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay != null && endDay != null && station_code == null) {
            cond.put("time_point", new BasicDBObject("$in", getDays(beginDay, endDay)));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay != null && endDay == null && station_code != null) {
            cond.put("time_point", beginDay);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else if (beginDay == null && endDay != null && station_code != null) {
            cond.put("time_point", endDay);
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        } else {
            cond.put("time_point", new BasicDBObject("$in", getDays(beginDay, endDay)));
            cond.put("station_code", new BasicDBObject("$in", station_code));
            result = collection.group(key, cond, initial, reduce, finalize);
        }
        return result.toString();
    }


    /**
     * 获取两个时间点中的时间数组
     * @param beginDay
     * @param endDay
     * @return
     */
    public List<String> getDays (String beginDay, String endDay)
    {
        List<String> days = new LinkedList<String>();
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd");
        try {
            Date bday = format.parse(beginDay);
            Date eday = format.parse(endDay);
            Calendar calendar = Calendar.getInstance();
            Calendar cend = Calendar.getInstance();
            calendar.setTime(new SimpleDateFormat("yyyy-MM-dd").parse(beginDay));
            cend.setTime(new SimpleDateFormat("yyyy-MM-dd").parse(endDay));
            Calendar d = (Calendar) calendar.clone();
            // 向后
            for (int i = 0; d.before(cend); i++, d.add(Calendar.DAY_OF_YEAR, 1)) {
                days.add(format.format(d.getTime()));
            }
            days.add(endDay);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return days;
    }

}
