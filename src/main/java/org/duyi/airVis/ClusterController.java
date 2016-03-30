package org.duyi.airVis;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.operation.valid.IsValidOp;
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
import org.pujun.interp.InterpMeteo;
import org.pujun.interp.InterpPm;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.File;
import java.io.FileInputStream;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Random;

/**
 * Created by yidu on 3/29/16.
 */
@Controller
public class ClusterController {
    private static final String NEW_DB_NAME = "airdb";
    private static final String CITY_PATH = "/Users/yidu/dev/airvis/src/main/webapp/maps/china_cities.json";
    /**
     * String[] codes = {"1001A", "1002A"};
     * double maxDistance = 200000;//最大距离约束
     * @return 根据输入的站点值和最大距离,给出聚类结果
     *
     * 返回结果如下:
     *
    [{"cluster":[[{"code":"1006A","city":"北京市","latitude":39.9425,"station":"官园","point":"POINT (116.361 39.9425)","longitude":116.361}]],"centerY":[39.92829649191552],"centerX":[116.3665953861068]},
    {"cluster":[[{"code":"1004A","city":"北京市","latitude":39.8745,"station":"天坛","point":"POINT (116.434 39.8745)","longitude":116.434}]],"centerY":[39.88331922006622],"centerX":[116.41830732208214]},
    {"cluster":[[{"code":"1003A","city":"北京市","latitude":39.9522,"station":"东四","point":"POINT (116.434 39.9522)","longitude":116.434},{"code":"1005A","city":"北京市","latitude":39.9716,"station":"农展馆","point":"POINT (116.473 39.9716)","longitude":116.473},{"code":"1011A","city":"北京市","latitude":40.0031,"station":"奥体中心","point":"POINT (116.407 40.0031)","longitude":116.407}]],"centerY":[39.95284375537745],"centerX":[116.51521256978202]},
    {"cluster":[[{"code":"1007A","city":"北京市","latitude":39.9934,"station":"海淀区万柳","point":"POINT (116.315 39.9934)","longitude":116.315},{"code":"1012A","city":"北京市","latitude":39.9279,"station":"古城","point":"POINT (116.225 39.9279)","longitude":116.225}]],"centerY":[40.02717109170304],"centerX":[116.2331073821836]},
    ....
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

            FeatureJSON fj = new FeatureJSON();
            FeatureCollection fc = fj.readFeatureCollection(new FileInputStream(new File(CITY_PATH)));
            FeatureIterator iterator = fc.features();
            ArrayList<Geometry> cityArea = new ArrayList<Geometry>();
            JSONObject cluster ;
            JSONArray result = new JSONArray();
            while( iterator.hasNext() ){
                Feature feature = iterator.next();
                Geometry value = (Geometry)feature.getDefaultGeometryProperty().getValue();
                cityArea.add(value);
            }

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
                    cluster.append("centerX", cityArea.get(i).getCentroid().getX());
                    cluster.append("centerY", cityArea.get(i).getCentroid().getY());
                    cluster.append("cluster", oneCluster);
                    result.put(cluster);
                }

            }
            return result.toString();
        }catch(Exception e){
            e.printStackTrace();
        }
        return "nothing1";
    }
}
