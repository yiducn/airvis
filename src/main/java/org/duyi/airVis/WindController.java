package org.duyi.airVis;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Created by yidu on 4/7/16.
 *
 */

@Controller
public class WindController {

    private static final String NEW_DB_NAME = "airdb";
    private static final int LENGTH_X = 71;
    private static final int LENGTH_Y = 51;
    private static final int START_Y = 60;
    private static final int START_X = 70;
    private static final int END_X = 140;
    private static final int END_Y = 60;

    /**
     * 只计算起始时间的风并返回
     * 起始x70, 终止x140, 71
     * 起始y10, 终止y60, 51
     * http://tornado.sfsu.edu/geosciences/classes/m430/Wind/WindDirection.html
     * http://wx.gmu.edu/dev/clim301/lectures/wind/wind-uv.html
     */
    @RequestMapping(value = "winddata.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String windData(String startTime, String endTime) {
        if(startTime == null || endTime == null){
            return "no time";
        }

        JSONArray result = new JSONArray();
        MongoClient client = new MongoClient();
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection collStations = db.getCollection("meteo_stations");
        MongoCollection collData = db.getCollection(("meteo_data"));
        Calendar cal = Calendar.getInstance();
        //TODO time zone problem
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);

        //取出所有的站点,并添加上x和y值
        MongoCursor stations = collStations.find().iterator();
        HashMap<Integer, Integer> stationIndex = new HashMap<Integer, Integer>();
        while(stations.hasNext()){
            Document d = (Document)stations.next();
            int h = d.getInteger("usaf");
            int lat = (int)Math.round(d.getDouble("lat"));
            int lon = (int)Math.round(d.getDouble("lon"));
            int v = LENGTH_X * (START_Y - lat) + (lon - START_X);
            stationIndex.put(h, v);
        }

        Document match;
        Document group = new Document().append("$group",
                new Document().append("_id", "$usaf")
                        .append("spd", new Document("$first", "$spd"))
                        .append("dir", new Document("$first", "$dir")));
        List<Document> query = new ArrayList<Document>();
        try {
            cal.setTime(df.parse(startTime));
            match = new Document("$match",
                    new Document("time",
                            new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime))));
            query.add(match);
            query.add(group);
        }catch(ParseException e){
            e.printStackTrace();
        }

        JSONObject ucomp = new JSONObject();
        JSONObject vcomp = new JSONObject();
        JSONObject headerU = new JSONObject();
        JSONObject headerV = new JSONObject();

        try {
            headerU.put("lo1", START_X);
            headerU.put("lo2", END_X);
            headerU.put("la1", START_Y);
            headerU.put("la2", END_Y);
            headerU.put("nx", LENGTH_X);
            headerU.put("ny", LENGTH_Y);
            headerU.put("dx", 1);
            headerU.put("dy", 1);
            headerU.put("refTime", startTime);
            headerU.put("forecastTime", 1);//TODO
            headerU.put("parameterCategory", 2);
            headerU.put("parameterNumber", 2);
            ucomp.put("header", headerU);

            headerV.put("lo1", START_X);
            headerV.put("lo2", END_X);
            headerV.put("la1", START_Y);
            headerV.put("la2", END_Y);
            headerV.put("nx", LENGTH_X);
            headerV.put("ny", LENGTH_Y);
            headerV.put("dx", 1);
            headerV.put("dy", 1);
            headerV.put("refTime", startTime);
            headerV.put("forecastTime", 1);//TODO
            headerV.put("parameterCategory", 2);
            headerV.put("parameterNumber", 3);
            vcomp.put("header", headerV);
        }catch(Exception e){
            e.printStackTrace();
        }

        int count = LENGTH_X * LENGTH_Y;
        double[] uValueArray = new double[count];
        double[] vValueArray = new double[count];
        for(int i = 0; i < count; i ++){
            uValueArray[i] = 0;
            vValueArray[i] = 0;
        }

        MongoCursor cur  = collData.aggregate(query).iterator();
        while(cur.hasNext()){
            Document d = (Document)cur.next();
            double spd = d.getDouble("spd");
            if(spd == -1)
                continue;
            int usaf = d.getInteger("_id");
            if(uValueArray[stationIndex.get(usaf)] != 0)
                continue;
            double dir = 270 - d.getDouble("dir");
            if(dir < 0 ){
                dir += 360;
            }

            double v = spd * Math.sin(dir * Math.PI / 180);
            double u = spd * Math.cos(dir * Math.PI / 180);
            uValueArray[stationIndex.get(usaf)] = u;
            vValueArray[stationIndex.get(usaf)] = v;
        }

        for(int i = 1+LENGTH_X; i < uValueArray.length-1-LENGTH_X; i ++){
            if(uValueArray[i] == 0 && uValueArray[i-1] != 0 && vValueArray[i +1] != 0){
                if(uValueArray[i-LENGTH_X] != 0 && uValueArray[i+LENGTH_X] != 0){
                    uValueArray[i] = (uValueArray[i - 1] + uValueArray[i + 1] + uValueArray[i-LENGTH_X] + uValueArray[i+LENGTH_X]) / 4;
                    vValueArray[i] = (vValueArray[i - 1] + vValueArray[i + 1] + vValueArray[i-LENGTH_X] + vValueArray[i+LENGTH_X]) / 4;
                }else {
                    uValueArray[i] = (uValueArray[i - 1] + uValueArray[i + 1]) / 2;
                    vValueArray[i] = (vValueArray[i - 1] + vValueArray[i + 1]) / 2;
                }
            }
        }
        try {
            ucomp.put("data", uValueArray);
//            System.out.println(uValue.toString());
            vcomp.put("data", vValueArray);
        }catch(Exception e){
            e.printStackTrace();
        }
        result.put(ucomp);
        result.put(vcomp);
        client.close();
        return result.toString();
    }

    /**
     * 计算起始及终止时间之间的所有气象站点,并返回
     * 起始x70, 终止x140, 71
     * 起始y10, 终止y60, 51
     * http://tornado.sfsu.edu/geosciences/classes/m430/Wind/WindDirection.html
     * http://wx.gmu.edu/dev/clim301/lectures/wind/wind-uv.html
     */
    @RequestMapping(value = "winddata2.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String windData2(String startTime, String endTime) {
        if(startTime == null || endTime == null){
            return "no time";
        }

        JSONArray result = new JSONArray();
        MongoClient client = new MongoClient();
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection collStations = db.getCollection("meteo_stations");
        MongoCollection collData = db.getCollection(("meteo_data"));
        Calendar cal = Calendar.getInstance();
        //TODO time zone problem
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);

        //取出所有的站点,并添加上x和y值
        MongoCursor stations = collStations.find().iterator();
        HashMap<Integer, Integer> stationIndex = new HashMap<Integer, Integer>();
        while(stations.hasNext()){
            Document d = (Document)stations.next();
            int h = d.getInteger("usaf");
            int lat = (int)Math.round(d.getDouble("lat"));
            int lon = (int)Math.round(d.getDouble("lon"));
            int v = LENGTH_X * (START_Y - lat) + (lon - START_X);
            stationIndex.put(h, v);
        }

        Document match;
        Document group = new Document().append("$group",
                new Document().append("_id", new Document("usaf", "$usaf").append("time", "$time"))
                        .append("spd", new Document("$first", "$spd"))
                        .append("dir", new Document("$first", "$dir")));
        List<Document> query = new ArrayList<Document>();
        try {
            cal.setTime(df.parse(startTime));
            match = new Document("$match",
                    new Document("time",
                            new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime))));
            query.add(match);
            query.add(group);
        }catch(ParseException e){
            e.printStackTrace();
        }

        JSONObject ucomp = new JSONObject();
        JSONObject vcomp = new JSONObject();
        JSONObject headerU = new JSONObject();
        JSONObject headerV = new JSONObject();

        try {
            headerU.put("lo1", START_X);
            headerU.put("lo2", END_X);
            headerU.put("la1", START_Y);
            headerU.put("la2", END_Y);
            headerU.put("nx", LENGTH_X);
            headerU.put("ny", LENGTH_Y);
            headerU.put("dx", 1);
            headerU.put("dy", 1);
            headerU.put("refTime", startTime);
            headerU.put("forecastTime", 1);//TODO
            headerU.put("parameterCategory", 2);
            headerU.put("parameterNumber", 2);
            ucomp.put("header", headerU);

            headerV.put("lo1", START_X);
            headerV.put("lo2", END_X);
            headerV.put("la1", START_Y);
            headerV.put("la2", END_Y);
            headerV.put("nx", LENGTH_X);
            headerV.put("ny", LENGTH_Y);
            headerV.put("dx", 1);
            headerV.put("dy", 1);
            headerV.put("refTime", startTime);
            headerV.put("forecastTime", 1);//TODO
            headerV.put("parameterCategory", 2);
            headerV.put("parameterNumber", 3);
            vcomp.put("header", headerV);
        }catch(Exception e){
            e.printStackTrace();
        }

        int count = LENGTH_X * LENGTH_Y;
        double[] uValueArray = new double[count];
        double[] vValueArray = new double[count];
        int[] valueCount = new int[count];//每个的点数目
        for(int i = 0; i < count; i ++){
            uValueArray[i] = 0;
            vValueArray[i] = 0;
            valueCount[i] = 0;
        }

        MongoCursor cur  = collData.aggregate(query).allowDiskUse(true).iterator();
        while(cur.hasNext()){
            Document d = (Document)cur.next();
            double spd = d.getDouble("spd");
            if(spd == -1)
                continue;
            int usaf = ((Document)d.get("_id")).getInteger("usaf");
//            if(uValueArray[stationIndex.get(usaf)] != 0)
//                continue;
            double dir = 270 - d.getDouble("dir");
            if(dir < 0 ){
                dir += 360;
            }

            double v = spd * Math.sin(dir * Math.PI / 180);
            double u = spd * Math.cos(dir * Math.PI / 180);
            uValueArray[stationIndex.get(usaf)] += u;
            vValueArray[stationIndex.get(usaf)] += v;
            valueCount[stationIndex.get(usaf)] ++;
        }
        for(int i = 0; i < count; i ++){
            if(valueCount[i] == 0)
                continue;
            uValueArray[i] = uValueArray[i]/valueCount[i];
            vValueArray[i] = vValueArray[i]/valueCount[i];
        }

        //填充缺失数据
        for(int i = 1+LENGTH_X; i < uValueArray.length-1-LENGTH_X; i ++){
            if(uValueArray[i] == 0 && uValueArray[i-1] != 0 && uValueArray[i +1] != 0){
                if(uValueArray[i-LENGTH_X] != 0 && uValueArray[i+LENGTH_X] != 0){
                    uValueArray[i] = (uValueArray[i - 1] + uValueArray[i + 1] + uValueArray[i-LENGTH_X] + uValueArray[i+LENGTH_X]) / 4;
                    vValueArray[i] = (vValueArray[i - 1] + vValueArray[i + 1] + vValueArray[i-LENGTH_X] + vValueArray[i+LENGTH_X]) / 4;
                }else {
                    uValueArray[i] = (uValueArray[i - 1] + uValueArray[i + 1]) / 2;
                    vValueArray[i] = (vValueArray[i - 1] + vValueArray[i + 1]) / 2;
                }
            }else if(uValueArray[i] == 0 && uValueArray[i- LENGTH_X] != 0 && uValueArray[i + LENGTH_X] != 0){
                if(uValueArray[i-1] != 0 && uValueArray[i+1] != 0){
                    uValueArray[i] = (uValueArray[i - 1] + uValueArray[i + 1] + uValueArray[i-LENGTH_X] + uValueArray[i+LENGTH_X]) / 4;
                    vValueArray[i] = (vValueArray[i - 1] + vValueArray[i + 1] + vValueArray[i-LENGTH_X] + vValueArray[i+LENGTH_X]) / 4;
                }else {
                    uValueArray[i] = (uValueArray[i - LENGTH_X] + uValueArray[i + LENGTH_X]) / 2;
                    vValueArray[i] = (vValueArray[i - LENGTH_X] + vValueArray[i + LENGTH_X]) / 2;
                }
            }
        }

        try {
            ucomp.put("data", uValueArray);
            vcomp.put("data", vValueArray);
        }catch(Exception e){
            e.printStackTrace();
        }
        result.put(ucomp);
        result.put(vcomp);

        client.close();
        return result.toString();
    }
}
