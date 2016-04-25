package org.duyi.airVis;

import com.mongodb.*;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.operation.valid.IsValidOp;
import org.apache.commons.math3.stat.inference.TTest;
import org.bson.Document;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.FeatureIterator;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.geojson.geom.GeometryJSON;
import org.geotools.geometry.jts.JTS;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.geotools.referencing.GeodeticCalculator;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.opengis.feature.Feature;
import org.pujun.correl.Correlation;
import org.pujun.interp.InterpMeteo;
import org.pujun.interp.InterpPm;
import org.springframework.cglib.core.Local;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.annotation.PostConstruct;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Created by yidu on 3/29/16.
 */
@Controller
@Scope("singleton")
public class ClusterController {
    private static final String NEW_DB_NAME = "airdb";
//    private static final String CITY_PATH = "/Users/yidu/dev/airvis/src/main/webapp/maps/china_cities.json";
    private static final String CITY_PATH_RELATIVE = "/../../maps/china_cities.json";
    private static ArrayList<Geometry> cityArea;
    private static String[] metoStations;

    @PostConstruct
    public void  init(){
        if(metoStations != null) {
            return;
        }
        FeatureJSON fj = new FeatureJSON();
        cityArea = new ArrayList<Geometry>();
        FeatureCollection fc = null;
        try{
            fc = fj.readFeatureCollection(this.getClass().getResourceAsStream(CITY_PATH_RELATIVE));//new FileInputStream(new File(CITY_PATH)));
        }catch(Exception e){
            e.printStackTrace();
        }
        FeatureIterator iterator = fc.features();
        while( iterator.hasNext() ){
            Feature feature = iterator.next();
            Geometry value = (Geometry)feature.getDefaultGeometryProperty().getValue();
            cityArea.add(value);
        }
        metoStations = getNearestStation(cityArea);
        System.out.println("init complete");
    }


    /**
     * String[] codes = {"1001A", "1002A"};
     * double maxDistance = 200000;//最大距离约束
     * @return 根据输入的站点值和最大距离,给出聚类结果
     *
     * 返回结果如下:
     *
    [{"cluster":[{"code":"2630A","city":"阿里地区","latitude":32.5,"station":"阿里监测站","point":"POINT (80.1161 32.5)","longitude":80.1161},{"code":"2631A","city":"阿里地区","latitude":32.5039,"station":"阿里地委","point":"POINT (80.0895 32.5039)","longitude":80.0895}],"centerY":33.03017272539136,"centerX":82.55745541810138,"angle":3},{"cluster":[{"code":"1954A","city":"克拉玛依市","latitude":44.3336,"station":"独山子区","point":"POINT (84.8983 44.3336)","longitude":84.8983}],"centerY":45.446010320866435,"centerX":85.1694460113506,"angle":1},{"cluster":[{"code":"2693A","city":"博州","latitude":44.9079,"station":"博乐市西郊区","point":"POINT (82.0485 44.9079)","longitude":82.0485},{"code":"2694A","city":"博州","latitude":44.8969,"station":"市环保局","point":"POINT (82.0806 44.8969)","longitude":82.0806}],"centerY":44.73734089035971,"centerX":82.12236781021181,"angle":1},{"cluster":[{"code":"1956A","city":"库尔勒市","latitude":41.7511,"station":"孔雀公园","point":"POINT (86.1461 41.7511)","longitude":86.1461},{"code":"1957A","city":"库尔勒市","latitude":41.7192,"station":"棉纺厂","point":"POINT (86.2022 41.7192)","longitude":86.2022},{"code":"1958A","city":"库尔勒市","latitude":41.7128,"station":"经济开发区","point":"POINT (86.2381 41.7128)","longitude":86.2381}],"centerY":39.49807254093696,"centerX":87.47418447395657,"angle":2},{"cluster":[{"code":"2695A","city":"阿克苏地区","latitude":41.1636,"station":"电视台","point":"POINT (80.2828 41.1636)","longitude":80.2828},{"code":"2696A","city":"阿克苏地区","latitude":41.1933,"station":"艺术中心","point":"POINT (80.2956 41.1933)","longitude":80.2956}],"centerY":40.961583439271244,"centerX":81.55654857903464,"angle":1},{"cluster":[{"code":"2701A","city":"和田地区","latitude":37.1152,"station":"地区站","point":"POINT (79.9485 37.1152)","longitude":79.9485},{"code":"2702A","city":"和田地区","latitude":37.1013,"station":"古江巴格乡院内","point":"POINT (79.9117 37.1013)","longitude":79.9117}],"centerY":37.07636221473472,"centerX":80.92700299425222,"angle":3},

    {
    "cluster":[{"code":"2703A","city":"伊犁哈萨克州","latitude":43.9404,"station":"市环保局","point":"POINT (81.2815 43.9404)","longitude":81.2815},{"code":"2704A","city":"伊犁哈萨克州","latitude":43.895,"station":"新政府片区","point":"POINT (81.2867 43.895)","longitude":81.2867},{"code":"2705A","city":"伊犁哈萨克州","latitude":43.941,"station":"第二水厂","point":"POINT (81.3364 43.941)","longitude":81.3364}],"centerY":43.46412943531677,"centerX":82.11668673611187,"angle":1
    }

    ] ....
     */

    @RequestMapping(value = "cluster.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String makeCluster(String[] codes, double maxDistance, double centerLon, double centerLat) {
        //input : codeList  distance
        //output : cluster
        //计算codeList的中心,可以在前端计算好
        //循环,找到所有满足要求的点
        //循环feature,对每一个feature,判断点是否在范围内,如果在,聚类

        MongoClient client = new MongoClient("127.0.0.1");
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection coll = db.getCollection("pm_stations");
        MongoCursor cur = coll.find().iterator();
        JSONObject oneStation;
        ArrayList<JSONObject> filtered = new ArrayList<JSONObject>();

        //中心 经度\纬度116°23′17〃，北纬：39°54′27;116.5, 40
        try {
            Document d;
            while(cur.hasNext()){
                d = (Document)cur.next();
                double lon = d.getDouble("lon");
                double lat = d.getDouble("lat");
                GeodeticCalculator calc = new GeodeticCalculator();
                // mind, this is lon/lat
                calc.setStartingGeographicPoint(lon, lat);
                calc.setDestinationGeographicPoint(centerLon, centerLat);//116.4, 40);
                double distance = calc.getOrthodromicDistance();

                //距离在最大距离之外的去除
                if(distance > maxDistance)
                    continue;

                //去除自己
                boolean self = false;
                for(int i = 0; i < codes.length; i ++) {
                    if (d.get("code").equals(codes[i]))
                        self = true;
                }
                if(self)
                    continue;

                oneStation = new JSONObject();
                GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();
                oneStation.put("city", d.getString("city"));
                oneStation.put("station", d.getString("name"));
                oneStation.put("longitude", d.getDouble("lon"));
                oneStation.put("latitude", d.getDouble("lat"));
                oneStation.put("code", d.getString("code"));
                Coordinate coord = new Coordinate(d.getDouble("lon"), d.getDouble("lat"), 0);
                Point point = geometryFactory.createPoint(coord);
                oneStation.put("point", point);
                filtered.add(oneStation);
            }

            JSONObject cluster ;
            JSONArray result = new JSONArray();
            for(int i = 0; i < cityArea.size(); i ++){
                //判断是否正确图形
                IsValidOp isValidOp = new IsValidOp(cityArea.get(i));
                if(!isValidOp.isValid())
                    continue;
                cluster = new JSONObject();
                JSONArray oneCluster = new JSONArray();

                for(int j = 0; j < filtered.size(); j ++){
                    if(cityArea.get(i).contains((Geometry)filtered.get(j).get("point"))){
                        oneCluster.put(filtered.get(j));
                    }
                }
                if(oneCluster.length() != 0) {
                    cluster.put("centerX", cityArea.get(i).getCentroid().getX());
                    cluster.put("centerY", cityArea.get(i).getCentroid().getY());
                    cluster.put("id", "cluster"+i);
                    //计算对应的角度,从北方向偏西22.5度开始为0, 每45度增加1
                    GeodeticCalculator calc = new GeodeticCalculator();
                    calc.setStartingGeographicPoint(cityArea.get(i).getCentroid().getX(), cityArea.get(i).getCentroid().getY());
                    calc.setDestinationGeographicPoint(centerLon, cityArea.get(i).getCentroid().getY());
                    double deltaX = calc.getOrthodromicDistance();
                    if(cityArea.get(i).getCentroid().getX() < centerLon)
                        deltaX = - deltaX;
                    calc.setStartingGeographicPoint(centerLon, cityArea.get(i).getCentroid().getY());
                    calc.setDestinationGeographicPoint(centerLon, centerLat);
                    double deltaY = calc.getOrthodromicDistance();
                    if(cityArea.get(i).getCentroid().getY() < centerLat)
                        deltaY = - deltaY;
                    //http://stackoverflow.com/questions/17574424/how-to-use-atan2-in-combination-with-other-radian-angle-systems
                    double angle = Math.toDegrees(Math.atan2(deltaX, deltaY));
                    if(angle < 0 )
                        angle += 360;
                    if((angle >= 0 && angle < 22.5) || (angle >= 337.5 && angle <= 360)){
                        cluster.put("angle", 0);
                    }else if(angle >= 22.5 && angle < 67.5){
                        cluster.put("angle", 1);
                    }else if(angle >= 67.5 && angle < 112.5){
                        cluster.put("angle", 2);
                    }else if(angle >= 112.5 && angle < 157.5){
                        cluster.put("angle", 3);
                    }else if(angle >= 157.5 && angle < 202.5){
                        cluster.put("angle", 4);
                    }else if(angle >= 202.5 && angle < 247.5){
                        cluster.put("angle", 5);
                    }else if(angle >= 247.5 && angle < 292.5) {
                        cluster.put("angle", 6);
                    }else if(angle >= 292.5 && angle < 337.5) {
                        cluster.put("angle", 7);
                    }
                    cluster.put("cluster", oneCluster);
                    result.put(cluster);
                }

            }
            client.close();
            return result.toString();
        }catch(Exception e){
            e.printStackTrace();
        }
        return "nothing1";
    }

    @RequestMapping(value = "clusterWithWind.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String clusterWithWind(String[] codes, double maxDistance, double centerLon, double centerLat, String startTime, String endTime) {
        //input : codeList  distance
        //output : cluster
        //计算codeList的中心,可以在前端计算好
        //循环,找到所有满足要求的点
        //循环feature,对每一个feature,判断点是否在范围内,如果在,聚类

        MongoClient client = new MongoClient("127.0.0.1");
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection coll = db.getCollection("pm_stations");
        MongoCursor cur = coll.find().iterator();
        JSONObject oneStation;
        ArrayList<JSONObject> filtered = new ArrayList<JSONObject>();
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);

        //中心 经度\纬度116°23′17〃，北纬：39°54′27;116.5, 40
        try {
            Document d;
            while(cur.hasNext()){
                d = (Document)cur.next();
                double lon = d.getDouble("lon");
                double lat = d.getDouble("lat");
                GeodeticCalculator calc = new GeodeticCalculator();
                // mind, this is lon/lat
                calc.setStartingGeographicPoint(lon, lat);
                calc.setDestinationGeographicPoint(centerLon, centerLat);//116.4, 40);
                double distance = calc.getOrthodromicDistance();

                //距离在最大距离之外的去除
                if(distance > maxDistance)
                    continue;

                //去除自己
                boolean self = false;
                for(int i = 0; i < codes.length; i ++) {
                    if (d.get("code").equals(codes[i]))
                        self = true;
                }
                if(self)
                    continue;


                oneStation = new JSONObject();
                GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();
                oneStation.put("city", d.getString("city"));
                oneStation.put("station", d.getString("name"));
                oneStation.put("longitude", d.getDouble("lon"));
                oneStation.put("latitude", d.getDouble("lat"));
                oneStation.put("code", d.getString("code"));
                Coordinate coord = new Coordinate(d.getDouble("lon"), d.getDouble("lat"), 0);
                Point point = geometryFactory.createPoint(coord);
                oneStation.put("point", point);
                filtered.add(oneStation);
            }

            JSONObject cluster ;
            JSONArray result = new JSONArray();

            //计算气象情况
            if(metoStations == null)
                metoStations = getNearestStation(cityArea);
            MongoCollection colMeteo = db.getCollection("meteodata_day");


            for(int i = 0; i < cityArea.size(); i ++){
                //判断是否正确图形
                IsValidOp isValidOp = new IsValidOp(cityArea.get(i));
                if(!isValidOp.isValid())
                    continue;
                cluster = new JSONObject();
                JSONArray oneCluster = new JSONArray();

                for(int j = 0; j < filtered.size(); j ++){
                    if(cityArea.get(i).contains((Geometry)filtered.get(j).get("point"))){
                        oneCluster.put(filtered.get(j));
                    }
                }

                if(oneCluster.length() != 0) {
                    cluster.put("centerX", cityArea.get(i).getCentroid().getX());
                    cluster.put("centerY", cityArea.get(i).getCentroid().getY());
                    cluster.put("id", "cluster"+i);

                    if(metoStations[i] != null) {
                        List<Document> query = new ArrayList<Document>();
                        //计算气象情况
                        Document match;
                        Document sort = new Document("$sort", new Document("time", 1));
                        Document group = new Document().append("$group",
                                new Document().append("_id", "$usaf")
                                        .append("dir", new Document("$avg", "$dir"))
                                        .append("spd", new Document("$avg", "$spd")));
                        match = new Document("$match", new Document("time",
                                new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)))
                                .append("usaf", new Document("$in", Arrays.asList(Integer.parseInt(metoStations[i])))));
                        query.add(match);
                        query.add(group);
                        MongoCursor curMeteo = colMeteo.aggregate(query).iterator();
                        if (curMeteo.hasNext()) {
                            Document dd = (Document) curMeteo.next();
                            cluster.put("spd", dd.getDouble("spd"));
                            cluster.put("dir", dd.getDouble("dir"));
                            cluster.put("metostation", metoStations[i]);
                        }
                    }

                    //计算对应的角度,从北方向偏西22.5度开始为0, 每45度增加1
                    GeodeticCalculator calc = new GeodeticCalculator();
                    calc.setStartingGeographicPoint(cityArea.get(i).getCentroid().getX(), cityArea.get(i).getCentroid().getY());
                    calc.setDestinationGeographicPoint(centerLon, cityArea.get(i).getCentroid().getY());
                    double deltaX = calc.getOrthodromicDistance();
                    if(cityArea.get(i).getCentroid().getX() < centerLon)
                        deltaX = - deltaX;
                    calc.setStartingGeographicPoint(centerLon, cityArea.get(i).getCentroid().getY());
                    calc.setDestinationGeographicPoint(centerLon, centerLat);
                    double deltaY = calc.getOrthodromicDistance();
                    if(cityArea.get(i).getCentroid().getY() < centerLat)
                        deltaY = - deltaY;
                    //http://stackoverflow.com/questions/17574424/how-to-use-atan2-in-combination-with-other-radian-angle-systems
                    double angle = Math.toDegrees(Math.atan2(deltaX, deltaY));
                    if(angle < 0 )
                        angle += 360;
//                    cluster.append("angle", (angle));
//                    System.out.println((angle)+":"+deltaY+":"+deltaX);
                    if((angle >= 0 && angle < 22.5) || (angle >= 337.5 && angle <= 360)){
                        cluster.put("angle", 0);
                    }else if(angle >= 22.5 && angle < 67.5){
                        cluster.put("angle", 1);
                    }else if(angle >= 67.5 && angle < 112.5){
                        cluster.put("angle", 2);
                    }else if(angle >= 112.5 && angle < 157.5){
                        cluster.put("angle", 3);
                    }else if(angle >= 157.5 && angle < 202.5){
                        cluster.put("angle", 4);
                    }else if(angle >= 202.5 && angle < 247.5){
                        cluster.put("angle", 5);
                    }else if(angle >= 247.5 && angle < 292.5) {
                        cluster.put("angle", 6);
                    }else if(angle >= 292.5 && angle < 337.5) {
                        cluster.put("angle", 7);
                    }
                    cluster.put("cluster", oneCluster);
                    result.put(cluster);
                }

            }

            client.close();
            return result.toString();
        }catch(Exception e){
            e.printStackTrace();
        }
        return "nothing1";
    }


    @RequestMapping(value = "newclusterWithWind.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String clusterWithWind2(String[] codes, double maxDistance, double centerLon, double centerLat, String startTime, String endTime) {
        //input : codeList  distance
        //output : cluster
        //计算codeList的中心,可以在前端计算好
        //循环,找到所有满足要求的点
        //循环feature,对每一个feature,判断点是否在范围内,如果在,聚类

        MongoClient client = new MongoClient("127.0.0.1");
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection coll = db.getCollection("pm_stations");
        MongoCollection collCluster = db.getCollection("cluster");
        MongoCursor cur = coll.find().iterator();
        JSONObject oneStation;
//        ArrayList<JSONObject> filtered = new ArrayList<JSONObject>();
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);

        //中心 经度\纬度116°23′17〃，北纬：39°54′27;116.5, 40
        try {
            Document d;
            HashMap<String, JSONObject> clusterResult = new HashMap<String, JSONObject>();
            while(cur.hasNext()){
                d = (Document)cur.next();
                double lon = d.getDouble("lon");
                double lat = d.getDouble("lat");
                GeodeticCalculator calc = new GeodeticCalculator();
                // mind, this is lon/lat
                calc.setStartingGeographicPoint(lon, lat);
                calc.setDestinationGeographicPoint(centerLon, centerLat);//116.4, 40);
                double distance = calc.getOrthodromicDistance();

                //距离在最大距离之外的去除
                if(distance > maxDistance)
                    continue;

                //去除自己
                boolean self = false;
                for(int i = 0; i < codes.length; i ++) {
                    if (d.get("code").equals(codes[i]))
                        self = true;
                }
                if(self)
                    continue;


                oneStation = new JSONObject();
                GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();
                oneStation.put("city", d.getString("city"));
                oneStation.put("station", d.getString("name"));
                oneStation.put("longitude", d.getDouble("lon"));
                oneStation.put("latitude", d.getDouble("lat"));
                oneStation.put("code", d.getString("code"));
                Coordinate coord = new Coordinate(d.getDouble("lon"), d.getDouble("lat"), 0);
                Point point = geometryFactory.createPoint(coord);
                oneStation.put("point", point);

                //add clusterid
                MongoCursor curCluster = collCluster.find(new Document("code",d.getString("code"))).iterator();
//                System.out.println(new Document("code",d.getString("code")));
                if(!curCluster.hasNext())//TODO
                    continue;

                String id = ((Document) curCluster.next()).getString("clusterid");
                oneStation.put("clusterid", id);
                if(clusterResult.containsKey(id)){
                    JSONObject temp = clusterResult.get(id);
                    temp.getJSONArray("cluster").put(oneStation);
                }else{
                    JSONObject temp = new JSONObject();
                    JSONArray tempArray = new JSONArray();
                    tempArray.put(oneStation);
                    temp.put("cluster", tempArray);
                    clusterResult.put(id, temp);
                }
//                filtered.add(oneStation);
            }

            JSONObject cluster ;
            JSONArray result = new JSONArray();

            //计算气象情况
            if(metoStations == null)
                metoStations = getNearestStation(cityArea);
            MongoCollection colMeteo = db.getCollection("meteodata_day");
            MongoCollection clusterMeteo = db.getCollection("clusterMeteo");

            Iterator<String> clusterIds = clusterResult.keySet().iterator();
            while(clusterIds.hasNext()){
                String id = clusterIds.next();
                cluster = clusterResult.get(id);
                JSONArray oneCluster = cluster.getJSONArray("cluster");

                double sumX = 0, sumY = 0;
                for(int j = 0; j < oneCluster.length(); j ++){
                    JSONObject station = oneCluster.getJSONObject(j);
                    Point p = (Point)station.get("point");
                    sumX += p.getX();
                    sumY += p.getY();
                }
                cluster.put("centerX", sumX/oneCluster.length());
                cluster.put("centerY", sumY/oneCluster.length());
                cluster.put("id", id);

                String  meteoStation = ((Document)clusterMeteo.find(new Document("clusterid", id)).iterator().next()).getInteger("usaf").toString();
//                System.out.println("station:"+meteoStation);

                List<Document> query = new ArrayList<Document>();
                //计算气象情况
                Document match;
                Document sort = new Document("$sort", new Document("time", 1));
                Document group = new Document().append("$group",
                        new Document().append("_id", "$usaf")
                                .append("dir", new Document("$avg", "$dir"))
                                .append("spd", new Document("$avg", "$spd")));
                match = new Document("$match", new Document("time",
                        new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)))
                        .append("usaf", new Document("$in", Arrays.asList(Integer.parseInt(meteoStation)))));
                query.add(match);
                query.add(group);
                MongoCursor curMeteo = colMeteo.aggregate(query).iterator();
                if (curMeteo.hasNext()) {
                    Document dd = (Document) curMeteo.next();
                    cluster.put("spd", dd.getDouble("spd"));
                    cluster.put("dir", dd.getDouble("dir"));
                    cluster.put("metostation", meteoStation);
                }


                //计算对应的角度,从北方向偏西22.5度开始为0, 每45度增加1
                GeodeticCalculator calc = new GeodeticCalculator();
                calc.setStartingGeographicPoint(oneCluster.getJSONObject(0).getDouble("longitude"), oneCluster.getJSONObject(0).getDouble("latitude"));
                calc.setDestinationGeographicPoint(centerLon, oneCluster.getJSONObject(0).getDouble("latitude"));
                double deltaX = calc.getOrthodromicDistance();
                if(oneCluster.getJSONObject(0).getDouble("longitude") < centerLon)
                    deltaX = - deltaX;
                calc.setStartingGeographicPoint(centerLon, oneCluster.getJSONObject(0).getDouble("latitude"));
                calc.setDestinationGeographicPoint(centerLon, centerLat);
                double deltaY = calc.getOrthodromicDistance();
                if(oneCluster.getJSONObject(0).getDouble("latitude") < centerLat)
                    deltaY = - deltaY;
                //http://stackoverflow.com/questions/17574424/how-to-use-atan2-in-combination-with-other-radian-angle-systems
                double angle = Math.toDegrees(Math.atan2(deltaX, deltaY));
                if(angle < 0 )
                    angle += 360;
//                    cluster.append("angle", (angle));
//                    System.out.println((angle)+":"+deltaY+":"+deltaX);
                if((angle >= 0 && angle < 22.5) || (angle >= 337.5 && angle <= 360)){
                    cluster.put("angle", 0);
                }else if(angle >= 22.5 && angle < 67.5){
                    cluster.put("angle", 1);
                }else if(angle >= 67.5 && angle < 112.5){
                    cluster.put("angle", 2);
                }else if(angle >= 112.5 && angle < 157.5){
                    cluster.put("angle", 3);
                }else if(angle >= 157.5 && angle < 202.5){
                    cluster.put("angle", 4);
                }else if(angle >= 202.5 && angle < 247.5){
                    cluster.put("angle", 5);
                }else if(angle >= 247.5 && angle < 292.5) {
                    cluster.put("angle", 6);
                }else if(angle >= 292.5 && angle < 337.5) {
                    cluster.put("angle", 7);
                }
                result.put(cluster);
            }

            client.close();
            return result.toString();
        }catch(Exception e){
            e.printStackTrace();
        }
        return "nothing1";
    }

    /**
     * 返回省份对应的气象站点,有可能返回空的数据,表示该city没有站点
     * @param g
     * @return
     */
    static String[] getNearestStation(ArrayList<Geometry> g){
        MongoClient client = new MongoClient();
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection coll = db.getCollection("meteo_stations");
        MongoCursor cur = coll.find().iterator();
        String[] ids = new String[g.size()];
        GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();

        while(cur.hasNext()){
            Document d = (Document)cur.next();
            for(int i = 0; i < g.size(); i ++){
                Coordinate coord = new Coordinate(d.getDouble("lon"), d.getDouble("lat"), 0);
                Point point = geometryFactory.createPoint(coord);
                //判断是否正确图形
                IsValidOp isValidOp = new IsValidOp(g.get(i));
                if(!isValidOp.isValid())
                    continue;
                if(g.get(i).contains(point)) {
                    ids[i] = d.getInteger("usaf").toString();
                    break;
                }
            }
        }
        client.close();
        return ids;
    }



    /**
     * 计算平均风速
     * @param wind
     * @return
     */
    //TODO 新方法
    double calOverAllWindSpeedByTime(double[] wind){
        double sum = 0;
        for(int i = 0; i < wind.length; i ++){
            sum += wind[i];
        }
        return sum/ wind.length;
    }

    /**
     * 计算平均风向
     * @param wind
     * @return
     */
    //TODO 新方法
    double calOverAllWindDirByTime(double[] wind){
        double sum = 0;
        for(int i = 0; i < wind.length; i ++){
            sum += wind[i];
        }
        return sum/ wind.length;
    }

    /**
     * 根据codes返回codes的themeriver数据
     * @param codes
     * @param startTime
     * @param endTime
     * @param index 方向的index
     * @return
     */
    @RequestMapping(value = "themeriverdata.do", method = RequestMethod.POST)
    public
    @ResponseBody
    //TODO 差值缺失数据
    String themeriverdata(String[] codes, String startTime, String endTime, int index, String cluster) {
        if(codes == null || codes.length == 0)
            return "";
        JSONArray jsonCluster = null;
        try{
            jsonCluster = new JSONArray(cluster);

        }catch(JSONException e){
            e.printStackTrace();
        }

        MongoClient client = new MongoClient();
        MongoDatabase db = client.getDatabase(NEW_DB_NAME);
        MongoCollection coll = db.getCollection("pmdata_day");
        MongoCollection collStation = db.getCollection("pm_stations");

        Calendar cal = Calendar.getInstance();
        //TODO time zone problem
        SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);

        Document filter = new Document();
        ArrayList<String> codeFilter = new ArrayList<String>();
        for(int i = 0; i < codes.length; i ++){
            codeFilter.add(codes[i]);
        }
        try {
            filter.append("time", new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)));
            filter.append("code", new Document().append("$in", codeFilter));
        }catch(ParseException pe){
            pe.printStackTrace();
        }

        //找经纬度的filter
        HashMap<String, Double> latMap = new HashMap<String, Double>();
        HashMap<String, Double> lonMap = new HashMap<String, Double>();
        Document llFilter = new Document();
        llFilter.append("code", new Document().append("$in", codeFilter));
        MongoCursor curLL = collStation.find(llFilter).iterator();
        while(curLL.hasNext()){
            Document d = (Document)curLL.next();
            latMap.put(d.getString("code"), d.getDouble("lat"));
            lonMap.put(d.getString("code"), d.getDouble("lon"));
        }

        MongoCursor cur = coll.find(filter).iterator();

        JSONObject result = new JSONObject();
        JSONArray res = new JSONArray();

        while(cur.hasNext()){
            Document d = (Document)cur.next();
            d.put("time", d.get("time"));
            d.put("pm25", d.get("pm25"));
            d.put("code", d.get("code"));
            d.put("city", d.get("city"));
            d.put("lat", latMap.get(d.get("code")));
            d.put("lon", lonMap.get(d.get("code")));
            res.put(d);
        }
        try {
            result.put("result", res);
            result.put("index", index);
        }catch(Exception e){
            e.printStackTrace();
        }
        JSONObject oneLagCor;
        JSONArray lagCor = new JSONArray();
        //根据code,得到对应的lag和cor,赋值给result
        try {
            for (int i = 0; i < jsonCluster.length(); i++) {
                JSONObject oneCluster = jsonCluster.getJSONObject(i);
                JSONArray codeCluster = oneCluster.getJSONArray("cluster");
                for(int j = 0; j < codeCluster.length(); j ++){
                    for(int k = 0; k < codes.length; k ++){
                        if(!codeCluster.getJSONObject(j).getString("code").equals(codes[k])){
                            continue;
                        }
                        oneLagCor = new JSONObject();
                        oneLagCor.put("code", codes[k]);
                        oneLagCor.put("cor", oneCluster.getDouble("correlation"));
                        oneLagCor.put("lag", oneCluster.getInt("lag"));
                        lagCor.put(oneLagCor);
                    }
                }
            }
            result.put("lag", lagCor);
        }catch(Exception ee){
                ee.printStackTrace();
        }
        client.close();
        return result.toString();
    }

    /**
     * 根据当前的起始时间,更新风向\风速
     * @param cluster
     * @param startTime
     * @param endTime
     * @return
     */
    private String updateWind(String cluster, String startTime, String endTime){
        JSONArray jsonCluster = null;
        try {
            SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);
            jsonCluster = new JSONArray(cluster);
            //连接数据库
            MongoClient client = new MongoClient("127.0.0.1", 27017);
            MongoDatabase db = client.getDatabase(NEW_DB_NAME);
            MongoCollection colMeteo = db.getCollection("meteodata_day");

            for(int i = 0; i < jsonCluster.length(); i ++){
                JSONObject oneCluster = jsonCluster.getJSONObject(i);
                if(!oneCluster.has("metostation"))
                    continue;
                if(oneCluster.get("metostation") != null) {
                    List<Document> query = new ArrayList<Document>();
                    //计算气象情况
                    Document match;
                    Document sort = new Document("$sort", new Document("time", 1));
                    Document group = new Document().append("$group",
                            new Document().append("_id", "$usaf")
                                    .append("dir", new Document("$avg", "$dir"))
                                    .append("spd", new Document("$avg", "$spd")));
                    match = new Document("$match", new Document("time",
                            new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)))
                            .append("usaf", new Document("$in", Arrays.asList(Integer.parseInt(oneCluster.getString("metostation"))))));
                    query.add(match);
                    query.add(group);
                    MongoCursor curMeteo = colMeteo.aggregate(query).iterator();
                    if (curMeteo.hasNext()) {
                        Document dd = (Document) curMeteo.next();
                        oneCluster.remove("spd");
                        oneCluster.remove("dir");
                        oneCluster.put("spd", dd.getDouble("spd"));
                        oneCluster.put("dir", dd.getDouble("dir"));
                    }
                }
            }
            client.close();
            return jsonCluster.toString();

        }catch(Exception e){
            e.printStackTrace();
            return "exception";
        }
    }

    /**
     * 根据cluster结果 计算相关性
     * 从每个cluster中选择一个站点(任选),计算该站点在选定时间内,与中心区域某一个站点(任选)的相关性
     * @param cluster
     * @param startTime detailBrush选定的开始时间
     * @param endTime detailBrush选定的结束时间
     * @param codes 中心区域的站点
     * @return
     */
    @RequestMapping(value = "correlation.do", method = RequestMethod.POST)
    public
    @ResponseBody
        //TODO
    String correlation(String cluster, String startTime, String endTime, String[] codes) {
        String clusterAfterUpdateWind = updateWind(cluster, startTime, endTime);
        try {
            //获取cluster中第一个台站的的code
            JSONArray jsonCluster = new JSONArray(clusterAfterUpdateWind);

            //连接数据库
            MongoClient client = new MongoClient("127.0.0.1", 27017);
            DB db = client.getDB(NEW_DB_NAME);
            DBCollection pmCollection = db.getCollection("pm_data");
            DBCollection pmStationCollection = db.getCollection("pm_stations");
            DBCollection clusterCollection = db.getCollection("cluster");
            DBCollection clusterMeteoCollection = db.getCollection("clusterMeteo");
            DBCollection meteoStationCollection = db.getCollection("meteo_stations");
            DBCollection meteoCollection = db.getCollection("meteo_data");
            DBCollection meteoCollectionDaily = db.getCollection("meteodata_day");

            //日期格式、时区设置
            //TODO time zone problem
            SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);
//            df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
            Calendar cal = Calendar.getInstance();

            //初始化日期循环
            Date thisDate;
            Date endDate = df.parse(endTime);
            ArrayList<Double> codeTimeSeries = new ArrayList<Double>();

            //查询code[0]的各时刻历史数据
            thisDate = df.parse(startTime);
            cal.setTime(thisDate);
            BasicDBObject queryCode = new BasicDBObject();
            double thisCodePM25, lastCodePM25=0;
            while(thisDate.before(endDate)) {
                queryCode.append("time", new Document("$gte", thisDate).append("$lt", new Date(thisDate.getTime()+24*60*60*1000)));
                queryCode.append("code", codes[0]);
                DBCursor cur = pmCollection.find(queryCode);
                if (cur.hasNext()) {    //若存在此时刻的历史数据，则直接将历史数据加入list中
                    thisCodePM25 = Double.parseDouble(cur.next().get("pm25").toString());
                    codeTimeSeries.add(thisCodePM25);
                    lastCodePM25 = thisCodePM25;
                } else {    //若不存在这个时间，则复制前一个时刻的历史数值
                    codeTimeSeries.add(lastCodePM25);
                }
                cal.add(Calendar.HOUR, 1);  //时间+1h循环
                thisDate = cal.getTime();
            }

            double[] codeTimeSeriesDouble = new double[codeTimeSeries.size()];
            for (int n = 0; n < codeTimeSeries.size(); n++) {
                codeTimeSeriesDouble[n] = codeTimeSeries.get(n);
            }

            BasicDBObject queryCenterMeteoStation = new BasicDBObject();   //圆心内站点的经纬度
            queryCenterMeteoStation.append("code", codes[0]);//TODO
            DBCursor curCenterMeteoStation = pmStationCollection.find(queryCenterMeteoStation);
            DBObject thisCenterMeteoStation = curCenterMeteoStation.next();//TODO
            double centerLat = Double.parseDouble(thisCenterMeteoStation.get("lat").toString());
            double centerLon = Double.parseDouble(thisCenterMeteoStation.get("lon").toString());

            for(int i = 0; i < jsonCluster.length(); i ++){
                //－－－－－－－－－－计算距离／查询风速＝往前推的时间－－－－－－－－－－－－
                double clusterDistance, clusterSpd;
                int addition = 0;
                String oneCluster = jsonCluster.getJSONObject(i).getJSONArray("cluster").getJSONObject(0).getString("code");

                BasicDBObject queryClusterID = new BasicDBObject();     //查询该站所在的cluster的编号clusterid
                queryClusterID.append("code", oneCluster);
                DBCursor curCluesterID = clusterCollection.find(queryClusterID);
                String clusterID = curCluesterID.next().get("clusterid").toString();

                BasicDBObject queryClusterMeteo = new BasicDBObject();      //查询此cluster对应的meteo站编号usaf
                queryClusterMeteo.append("clusterid",clusterID);
                DBCursor curClusterMeteo = clusterMeteoCollection.find(queryClusterMeteo);
                int clusterMeteo = Integer.parseInt(curClusterMeteo.next().get("usaf").toString());

                //TODO 目前只计算了时间范围内的第一个
                BasicDBObject queryClusterMeteoData = new BasicDBObject();  //根据meteo站编号和起始时间查询当地风速spd
                queryClusterMeteoData.append("usaf",clusterMeteo);
                queryClusterMeteoData.append("time",new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)));
                DBCursor curClusterMeteoData = meteoCollectionDaily.find(queryClusterMeteoData);
                if(!curClusterMeteoData.hasNext())
                    clusterSpd = 0;
                else
                    clusterSpd = Double.parseDouble(curClusterMeteoData.next().get("spd").toString());

                BasicDBObject queryClusterMeteoStation = new BasicDBObject();   //根据meteo站编号查询其经纬度
                queryClusterMeteoStation.append("code",oneCluster);
                DBCursor curClusterMeteoStation = pmStationCollection.find(queryClusterMeteoStation);
                DBObject thisClusterMeteoStation = curClusterMeteoStation.next();
                double clusterLat = Double.parseDouble(thisClusterMeteoStation.get("lat").toString());
                double clusterLon = Double.parseDouble(thisClusterMeteoStation.get("lon").toString());

                GeodeticCalculator calc = new GeodeticCalculator();
                calc.setStartingGeographicPoint(clusterLon, clusterLat);
                calc.setDestinationGeographicPoint(centerLon, centerLat);
                clusterDistance = calc.getOrthodromicDistance() / 1609.344;

                if(clusterSpd != 0 && clusterSpd != -1) {
                    addition = (int) (clusterDistance / clusterSpd);
                }else{
                    addition = 24;
                }
                //－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－

                ArrayList<Double> clusterTimeSeries = new ArrayList<Double>();
                //查询cluster[0]的各时刻历史数据
                thisDate = df.parse(startTime);
                cal.setTime(thisDate);
                cal.add(Calendar.HOUR, -addition);     //cluster提前addition个小时
                thisDate = cal.getTime();
                BasicDBObject queryCluster = new BasicDBObject();
                double thisClusterPM25, lastClusterPM25 = 0;
                while(thisDate.before(endDate)) {
                    queryCluster.append("time", new Document("$gte", thisDate).append("$lt", new Date(thisDate.getTime()+24*60*60*1000)));
                    queryCluster.append("code", oneCluster);
                    DBCursor cur = pmCollection.find(queryCluster);
                    if (cur.hasNext()) {    //若存在此时刻的历史数据，则直接将历史数据加入list中
                        thisClusterPM25 = Double.parseDouble(cur.next().get("pm25").toString());
                        clusterTimeSeries.add(thisClusterPM25);
                        lastClusterPM25 = thisClusterPM25;
                    } else {    //若不存在这个时间，则复制前一个时刻的历史数值（存入在lastClusterPM25）
                        clusterTimeSeries.add(lastClusterPM25);
                    }
                    cal.add(Calendar.HOUR, 1);  //时间+1h循环
                    thisDate = cal.getTime();
                }

                //ArrayList转double数组
                double[] clusterTimeSeriesDouble = new double[clusterTimeSeries.size()];
                for (int m = 0; m < clusterTimeSeries.size(); m++) {
                    clusterTimeSeriesDouble[m] = clusterTimeSeries.get(m);
                }

                //计算相关性，[0]为最优lag，[1]为对应相关度，[2]为t检验的p值
                Correlation correlation = new Correlation();
                double[] lagCorrelation = correlation.getLagResultEarlier(codeTimeSeriesDouble, clusterTimeSeriesDouble);

                //TODO 计算correlation
                ((JSONObject) jsonCluster.get(i)).put("lag", addition - lagCorrelation[0]);
                ((JSONObject) jsonCluster.get(i)).put("correlation", lagCorrelation[1]);
                ((JSONObject) jsonCluster.get(i)).put("pvalue", lagCorrelation[2]);
            }
            client.close();
            return jsonCluster.toString();

        }catch(JSONException je){
            je.printStackTrace();
        }catch(ParseException pe){
            pe.printStackTrace();
        }
        return "exception";
    }

    /**
     * 根据cluster结果 计算相关性,与correlation.do差别在于这个计算同时计算了向后推移
     * 从每个cluster中选择一个站点(任选),计算该站点在选定时间内,与中心区域某一个站点(任选)的相关性
     * @param cluster
     * @param startTime detailBrush选定的开始时间
     * @param endTime detailBrush选定的结束时间
     * @param codes 中心区域的站点
     * @return
     */
    @RequestMapping(value = "correlation2.do", method = RequestMethod.POST)
    public
    @ResponseBody
    //TODO
    String correlation2(String cluster, String startTime, String endTime, String[] codes) {
        String clusterAfterUpdateWind = updateWind(cluster, startTime, endTime);
        try {
            //获取cluster中第一个台站的的code
            JSONArray jsonCluster = new JSONArray(clusterAfterUpdateWind);

            //连接数据库
            MongoClient client = new MongoClient("127.0.0.1", 27017);
            DB db = client.getDB(NEW_DB_NAME);
            DBCollection pmCollection = db.getCollection("pm_data");
            DBCollection pmStationCollection = db.getCollection("pm_stations");
            DBCollection clusterCollection = db.getCollection("cluster");
            DBCollection clusterMeteoCollection = db.getCollection("clusterMeteo");
            DBCollection meteoStationCollection = db.getCollection("meteo_stations");
            DBCollection meteoCollection = db.getCollection("meteo_data");
            DBCollection meteoCollectionDaily = db.getCollection("meteodata_day");

            //日期格式、时区设置
            //TODO time zone problem
            SimpleDateFormat df = new SimpleDateFormat("EEE MMM dd yyyy HH:mm:ss", Locale.US);
//            df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
            Calendar cal = Calendar.getInstance();
            Calendar cal2 = Calendar.getInstance();

            //初始化日期循环
            Date thisDate, endDate;
            ArrayList<Double> codeTimeSeries = new ArrayList<Double>();

            //查询code[0]的各时刻历史数据
            thisDate = df.parse(startTime);
            cal.setTime(thisDate);
            endDate= df.parse(endTime);
            BasicDBObject queryCode = new BasicDBObject();
            double thisCodePM25, lastCodePM25=0;
            while(thisDate.before(endDate)) {
                queryCode.append("time", new Document("$gte", thisDate).append("$lt", new Date(thisDate.getTime()+24*60*60*1000)));
                queryCode.append("code", codes[0]);
                DBCursor cur = pmCollection.find(queryCode);
                if (cur.hasNext()) {    //若存在此时刻的历史数据，则直接将历史数据加入list中
                    thisCodePM25 = Double.parseDouble(cur.next().get("pm25").toString());
                    codeTimeSeries.add(thisCodePM25);
                    lastCodePM25 = thisCodePM25;
                } else {    //若不存在这个时间，则复制前一个时刻的历史数值
                    codeTimeSeries.add(lastCodePM25);
                }
                cal.add(Calendar.HOUR, 1);  //时间+1h循环
                thisDate = cal.getTime();
            }

            double[] codeTimeSeriesDouble = new double[codeTimeSeries.size()];
            for (int n = 0; n < codeTimeSeries.size(); n++) {
                codeTimeSeriesDouble[n] = codeTimeSeries.get(n);
            }

            BasicDBObject queryCenterMeteoStation = new BasicDBObject();   //圆心内站点的经纬度
            queryCenterMeteoStation.append("code", codes[0]);//TODO
            DBCursor curCenterMeteoStation = pmStationCollection.find(queryCenterMeteoStation);
            DBObject thisCenterMeteoStation = curCenterMeteoStation.next();//TODO
            double centerLat = Double.parseDouble(thisCenterMeteoStation.get("lat").toString());
            double centerLon = Double.parseDouble(thisCenterMeteoStation.get("lon").toString());

            for(int i = 0; i < jsonCluster.length(); i ++){
                //－－－－－－－－－－计算距离／查询风速＝往前推的时间－－－－－－－－－－－－
                double clusterDistance, clusterSpd;
                int addition = 0;
                String oneCluster = jsonCluster.getJSONObject(i).getJSONArray("cluster").getJSONObject(0).getString("code");

                BasicDBObject queryClusterID = new BasicDBObject();     //查询该站所在的cluster的编号clusterid
                queryClusterID.append("code", oneCluster);
                DBCursor curCluesterID = clusterCollection.find(queryClusterID);
                String clusterID = curCluesterID.next().get("clusterid").toString();

                BasicDBObject queryClusterMeteo = new BasicDBObject();      //查询此cluster对应的meteo站编号usaf
                queryClusterMeteo.append("clusterid",clusterID);
                DBCursor curClusterMeteo = clusterMeteoCollection.find(queryClusterMeteo);
                int clusterMeteo = Integer.parseInt(curClusterMeteo.next().get("usaf").toString());

                //TODO 目前只计算了时间范围内的第一个
                BasicDBObject queryClusterMeteoData = new BasicDBObject();  //根据meteo站编号和起始时间查询当地风速spd
                queryClusterMeteoData.append("usaf",clusterMeteo);
                queryClusterMeteoData.append("time",new Document("$gt", df.parse(startTime)).append("$lt", df.parse(endTime)));
                DBCursor curClusterMeteoData = meteoCollectionDaily.find(queryClusterMeteoData);
                clusterSpd = Double.parseDouble(curClusterMeteoData.next().get("spd").toString());

                BasicDBObject queryClusterMeteoStation = new BasicDBObject();   //根据meteo站编号查询其经纬度
                queryClusterMeteoStation.append("code",oneCluster);
                DBCursor curClusterMeteoStation = pmStationCollection.find(queryClusterMeteoStation);
                DBObject thisClusterMeteoStation = curClusterMeteoStation.next();
                double clusterLat = Double.parseDouble(thisClusterMeteoStation.get("lat").toString());
                double clusterLon = Double.parseDouble(thisClusterMeteoStation.get("lon").toString());

                GeodeticCalculator calc = new GeodeticCalculator();
                calc.setStartingGeographicPoint(clusterLon, clusterLat);
                calc.setDestinationGeographicPoint(centerLon, centerLat);
                clusterDistance = calc.getOrthodromicDistance() / 1609.344;

                if(clusterSpd != 0 && clusterSpd != -1) {
                    addition = (int) (clusterDistance / clusterSpd);
                }else{
                    addition = 24;
                }
                //－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－－

                ArrayList<Double> clusterTimeSeries = new ArrayList<Double>();
                //查询cluster[0]的各时刻历史数据
                cal.setTime(df.parse(startTime));
                cal.add(Calendar.HOUR, -addition);     //cluster提前addition个小时
                thisDate = cal.getTime();

                cal2.setTime(df.parse(endTime));
                cal2.add(Calendar.HOUR,48);             //cluster往后48小时
                endDate = cal2.getTime();

                BasicDBObject queryCluster = new BasicDBObject();
                double thisClusterPM25, lastClusterPM25 = 0;
                while(thisDate.before(endDate)) {
                    queryCluster.append("time", new Document("$gte", thisDate).append("$lt", new Date(thisDate.getTime()+24*60*60*1000)));
                    queryCluster.append("code", oneCluster);
                    DBCursor cur = pmCollection.find(queryCluster);
                    if (cur.hasNext()) {    //若存在此时刻的历史数据，则直接将历史数据加入list中
                        thisClusterPM25 = Double.parseDouble(cur.next().get("pm25").toString());
                        clusterTimeSeries.add(thisClusterPM25);
                        lastClusterPM25 = thisClusterPM25;
                    } else {    //若不存在这个时间，则复制前一个时刻的历史数值（存入在lastClusterPM25）
                        clusterTimeSeries.add(lastClusterPM25);
                    }
                    cal.add(Calendar.HOUR, 1);  //时间+1h循环
                    thisDate = cal.getTime();
                }

                //ArrayList转double数组
                double[] clusterTimeSeriesDouble = new double[clusterTimeSeries.size()];
                for (int m = 0; m < clusterTimeSeries.size(); m++) {
                    clusterTimeSeriesDouble[m] = clusterTimeSeries.get(m);
                }

                //计算相关性，[0]为最优lag，[1]为对应相关度，[2]为t检验的p值
                Correlation correlation = new Correlation();
                double[] lagCorrelation = correlation.getLagResultEarlier(codeTimeSeriesDouble, clusterTimeSeriesDouble);

                //TODO 计算correlation
                ((JSONObject) jsonCluster.get(i)).put("lag", addition - lagCorrelation[0]);
                ((JSONObject) jsonCluster.get(i)).put("correlation", lagCorrelation[1]);
                ((JSONObject) jsonCluster.get(i)).put("pvalue", lagCorrelation[2]);
            }
            client.close();
            return jsonCluster.toString();

        }catch(JSONException je){
            je.printStackTrace();
        }catch(ParseException pe){
            pe.printStackTrace();
        }
        return "exception";
    }
}

