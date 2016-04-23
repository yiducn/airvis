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
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.geotools.referencing.GeodeticCalculator;
import org.json.JSONArray;
import org.json.JSONObject;
import org.opengis.feature.Feature;
import org.pujun.correl.CorrelationTest;

import java.io.File;
import java.io.FileInputStream;
import java.util.*;

/**
 * Created by yidu on 4/22/16.
 * 目前暂时使用离线计算
 */
public class Clustering {
    private static final String CITY_PATH = "/Users/yidu/dev/airvisprocessing/src/main/java/org/duyi/china_cities.json";
    public static void main(String[] args) {
        FeatureJSON fj = new FeatureJSON();
        ArrayList<Geometry> cityArea = new ArrayList<Geometry>();
        FeatureCollection fc = null;
        try {
            fc = fj.readFeatureCollection(new FileInputStream(new File(CITY_PATH)));
        } catch (Exception e) {
            e.printStackTrace();
        }
        FeatureIterator iterator = fc.features();
        while (iterator.hasNext()) {
            Feature feature = iterator.next();
            Geometry value = (Geometry) feature.getDefaultGeometryProperty().getValue();
            cityArea.add(value);
        }


        MongoClient client = new MongoClient("127.0.0.1");
        MongoDatabase db = client.getDatabase("airdb");
        MongoCollection coll = db.getCollection("pm_stations");
        MongoCursor cur = coll.find().iterator();
        JSONObject oneStation;
        ArrayList<JSONObject> filtered = new ArrayList<JSONObject>();

        //中心 经度\纬度116°23′17〃，北纬：39°54′27;116.5, 40
        try {
            Document d;
            //该操作将所有点先找出来
            while (cur.hasNext()) {
                d = (Document) cur.next();
                double lon = d.getDouble("lon");
                double lat = d.getDouble("lat");
                GeodeticCalculator calc = new GeodeticCalculator();
                // mind, this is lon/lat
                calc.setStartingGeographicPoint(lon, lat);

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

            JSONObject cluster;
            JSONArray result = new JSONArray();
            //北京天津上海重庆特殊处理,先各聚在一起,然后在分解
            JSONArray bjCluster = new JSONArray();
            JSONArray tjCluster = new JSONArray();
            JSONArray shCluster = new JSONArray();
            JSONArray cqCluster = new JSONArray();
            for (int j = 0; j < filtered.size(); j++) {
                if(filtered.get(j).getString("city").startsWith("北京")){
                    bjCluster.put(filtered.get(j));
                }else if(filtered.get(j).getString("city").startsWith("天津")){
                    tjCluster.put(filtered.get(j));
                }else if(filtered.get(j).getString("city").startsWith("上海")) {
                    shCluster.put(filtered.get(j));
                }else if(filtered.get(j).getString("city").startsWith("重庆")){
                    cqCluster.put(filtered.get(j));
                }
            }
            cluster = new JSONObject();
            cluster.put("cluster", bjCluster);
            result.put(cluster);
            cluster = new JSONObject();
            cluster.put("cluster", tjCluster);
            result.put(cluster);
            cluster = new JSONObject();
            cluster.put("cluster", shCluster);
            result.put(cluster);
            cluster = new JSONObject();
            cluster.put("cluster", cqCluster);
            result.put(cluster);

            for (int i = 0; i < cityArea.size(); i++) {
                //判断是否正确图形
                IsValidOp isValidOp = new IsValidOp(cityArea.get(i));
                if (!isValidOp.isValid())
                    continue;
                cluster = new JSONObject();
                JSONArray oneCluster = new JSONArray();
//                if()
                for (int j = 0; j < filtered.size(); j++) {
                    if(filtered.get(j).getString("city").startsWith("北京") ||
                            filtered.get(j).getString("city").startsWith("天津") ||
                            filtered.get(j).getString("city").startsWith("上海") ||
                            filtered.get(j).getString("city").startsWith("重庆"))
                        continue;
                    if (cityArea.get(i).contains((Geometry) filtered.get(j).get("point"))) {
                        oneCluster.put(filtered.get(j));
                    }
                }
                if (oneCluster.length() != 0) {
                    cluster.put("cluster", oneCluster);
                    result.put(cluster);
                }
            }
            MongoCollection colCluster = db.getCollection("cluster");
            int clusterId = 0;
//            JSONArray finalCluster   = new JSONArray();
            for(int i = 0; i < result.length(); i ++){
                JSONArray oneCluster = result.getJSONObject(i).getJSONArray("cluster");
                String[] codes = new String[oneCluster.length()];
                for(int j = 0; j < oneCluster.length(); j ++){
                    codes[j] = oneCluster.getJSONObject(j).getString("code");
                }

                //计算各个station之间的相关性
                ArrayList<String[]> cResult = new ArrayList<String[]>();
                clusterInOneCity(cResult, codes, 0);
                for(int j = 0; j < cResult.size(); j ++){
                    clusterId ++;
                    for(int k = 0; k < cResult.get(j).length; k ++){
                        Document dd = new Document();
                        dd.put("code", cResult.get(j)[k]);
                        dd.put("clusterid", "clusterid"+clusterId);
                        colCluster.insertOne(dd);
                    }
                }
            }
//            System.out.println(result.toString());

        }catch(Exception e){
            e.printStackTrace();
        }
    }

    /**
     * 如果codes不再变化,终止循环
     * @param result cluster之后的结果
     * @param codes 剩下的
     */
    public static void clusterInOneCity(ArrayList<String[]> result, String[] codes, int formerLength) {
        try {
//            System.out.println("formerLength:"+formerLength);
            if(formerLength == codes.length || codes.length <= 1){
                for(int i = 0; i < codes.length; i ++){
                    String[] a = {codes[i]};
                    result.add(a);
                }
                return;
            }
            else {
                CorrelationTest correlationTest = new CorrelationTest();
                double[][] correlation = new double[codes.length][codes.length];
                double[][] ttest = new double[codes.length][codes.length];

                for (int j = 0; j < codes.length; j++) {
                    for (int k = 0; k < codes.length; k++) {
                        double[] r = correlationTest.getCorrelPM25(codes[j], "2015-03-01 00:00:00", "2015-03-31 00:00:00", codes[k]);
                        correlation[j][k] = r[0];
                        ttest[j][k] = r[1];
                    }
                }
//                System.out.println("one complete");
                List<String> oneClusterT = Arrays.asList((String[])codes);
                ArrayList<String> oneCluster = new ArrayList<String>();
                for(int i = 0; i < oneClusterT.size(); i++){
                    oneCluster.add(oneClusterT.get(i));
                }
                HashSet<String> temp = new HashSet<String>();
                for (int i = 0; i < codes.length; i++) {
                    for (int j = (i+1); j < codes.length; j++) {
                        if (i != j && (correlation[i][j] < 0.5 || ttest[i][j] > 0.05)) {
//                            temp.add(codes[i]);
                            temp.add(codes[j]);
//                            oneCluster.remove(codes[i]);
                            oneCluster.remove(codes[j]);
                        }
                    }
                }
                String[] a = oneCluster.toArray(new String[oneCluster.size()]);
                result.add(a);
                clusterInOneCity(result, temp.toArray(new String[temp.size()]), codes.length);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

